# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
# pylint: disable=unused-argument, import-outside-toplevel, unused-import, invalid-name

import copy
from collections.abc import Generator
from unittest.mock import patch

import pytest
import yaml
from flask_appbuilder.security.sqla.models import Role, User
from pytest_mock import MockerFixture
from sqlalchemy.orm.session import Session

from superset import security_manager
from superset.commands.dashboard.importers.v1.utils import import_dashboard
from superset.commands.exceptions import ImportFailedError
from superset.commands.importers.v1.utils import import_tag
from superset.extensions import feature_flag_manager
from superset.models.dashboard import Dashboard
from superset.tags.models import TaggedObject
from superset.utils.core import override_user
from tests.integration_tests.fixtures.importexport import dashboard_config


@pytest.fixture
def session_with_data(session: Session) -> Generator[Session, None, None]:
    engine = session.get_bind()
    Dashboard.metadata.create_all(engine)  # pylint: disable=no-member

    dashboard = Dashboard(
        id=100,
        dashboard_title="Test dash",
        slug=None,
        slices=[],
        published=True,
        uuid=dashboard_config["uuid"],
    )

    session.add(dashboard)
    session.flush()
    yield session
    session.rollback()


@pytest.fixture
def session_with_schema(session: Session) -> Generator[Session, None, None]:
    engine = session.get_bind()
    Dashboard.metadata.create_all(engine)  # pylint: disable=no-member

    yield session
    session.rollback()


def test_import_dashboard(mocker: MockerFixture, session_with_schema: Session) -> None:
    """
    Test importing a dashboard.
    """
    mock_can_access = mocker.patch.object(
        security_manager, "can_access", return_value=True
    )

    dashboard = import_dashboard(dashboard_config)
    assert dashboard.dashboard_title == "Test dash"
    assert dashboard.description is None
    assert dashboard.is_managed_externally is False
    assert dashboard.external_url is None
    # Assert that the can write to dashboard was checked
    mock_can_access.assert_called_once_with("can_write", "Dashboard")


def test_import_dashboard_managed_externally(
    mocker: MockerFixture,
    session_with_schema: Session,
) -> None:
    """
    Test importing a dashboard that is managed externally.
    """
    mock_can_access = mocker.patch.object(
        security_manager, "can_access", return_value=True
    )

    config = copy.deepcopy(dashboard_config)
    config["is_managed_externally"] = True
    config["external_url"] = "https://example.org/my_dashboard"
    dashboard = import_dashboard(config)
    assert dashboard.is_managed_externally is True
    assert dashboard.external_url == "https://example.org/my_dashboard"

    # Assert that the can write to dashboard was checked
    mock_can_access.assert_called_once_with("can_write", "Dashboard")


def test_import_dashboard_without_permission(
    mocker: MockerFixture,
    session_with_schema: Session,
) -> None:
    """
    Test importing a dashboard when a user doesn't have permissions to create.
    """
    mock_can_access = mocker.patch.object(
        security_manager, "can_access", return_value=False
    )

    with pytest.raises(ImportFailedError) as excinfo:
        import_dashboard(dashboard_config)
    assert (
        str(excinfo.value)
        == "Dashboard doesn't exist and user doesn't have permission to create dashboards"  # noqa: E501
    )

    # Assert that the can write to dashboard was checked
    mock_can_access.assert_called_once_with("can_write", "Dashboard")


def test_import_existing_dashboard_without_access_permission(
    mocker: MockerFixture,
    session_with_data: Session,
) -> None:
    """
    Test importing a dashboard when a user doesn't have permissions to create.
    """
    mock_can_access = mocker.patch.object(
        security_manager, "can_access", return_value=True
    )
    mock_can_access_dashboard = mocker.patch.object(
        security_manager, "can_access_dashboard", return_value=False
    )

    dashboard = (
        session_with_data.query(Dashboard)
        .filter(Dashboard.uuid == dashboard_config["uuid"])
        .one_or_none()
    )

    admin = User(
        first_name="Alice",
        last_name="Doe",
        email="adoe@example.org",
        username="admin",
        roles=[Role(name="Admin")],
    )

    with override_user(admin):
        with pytest.raises(ImportFailedError) as excinfo:
            import_dashboard(dashboard_config, overwrite=True)
        assert (
            str(excinfo.value)
            == "A dashboard already exists and user doesn't have permissions to overwrite it"  # noqa: E501
        )

    # Assert that the can write to dashboard was checked
    mock_can_access.assert_called_once_with("can_write", "Dashboard")
    mock_can_access_dashboard.assert_called_once_with(dashboard)


def test_import_existing_dashboard_without_owner_permission(
    mocker: MockerFixture,
    session_with_data: Session,
) -> None:
    """
    Test importing a dashboard when a user doesn't have ownership and is not an Admin.
    """
    mock_can_access = mocker.patch.object(
        security_manager, "can_access", return_value=True
    )
    mock_can_access_dashboard = mocker.patch.object(
        security_manager, "can_access_dashboard", return_value=True
    )

    dashboard = (
        session_with_data.query(Dashboard)
        .filter(Dashboard.uuid == dashboard_config["uuid"])
        .one_or_none()
    )

    user = User(
        first_name="Alice",
        last_name="Doe",
        email="adoe@example.org",
        username="admin",
        roles=[Role(name="Gamma")],
    )

    with override_user(user):
        with pytest.raises(ImportFailedError) as excinfo:
            import_dashboard(dashboard_config, overwrite=True)
        assert (
            str(excinfo.value)
            == "A dashboard already exists and user doesn't have permissions to overwrite it"  # noqa: E501
        )

    # Assert that the can write to dashboard was checked
    mock_can_access.assert_called_once_with("can_write", "Dashboard")
    mock_can_access_dashboard.assert_called_once_with(dashboard)


def test_import_existing_dashboard_with_permission(
    mocker: MockerFixture,
    session_with_data: Session,
) -> None:
    """
    Test importing a dashboard that exists when a user has access permission to that dashboard.
    """  # noqa: E501
    mock_can_access = mocker.patch.object(
        security_manager, "can_access", return_value=True
    )
    mock_can_access_dashboard = mocker.patch.object(
        security_manager, "can_access_dashboard", return_value=True
    )

    admin = User(
        first_name="Alice",
        last_name="Doe",
        email="adoe@example.org",
        username="admin",
        roles=[Role(name="Admin")],
    )

    dashboard = (
        session_with_data.query(Dashboard)
        .filter(Dashboard.uuid == dashboard_config["uuid"])
        .one_or_none()
    )

    with override_user(admin):
        import_dashboard(dashboard_config, overwrite=True)

    # Assert that the can write to dashboard was checked
    mock_can_access.assert_called_once_with("can_write", "Dashboard")
    mock_can_access_dashboard.assert_called_once_with(dashboard)


def test_import_tag_logic_for_dashboards(session_with_schema: Session):
    contents = {
        "tags.yaml": yaml.dump(
            {"tags": [{"tag_name": "tag_1", "description": "Description for tag_1"}]}
        )
    }

    object_id = 1
    object_type = "dashboards"

    with patch.object(feature_flag_manager, "is_feature_enabled", return_value=True):
        new_tag_ids = import_tag(
            ["tag_1"], contents, object_id, object_type, session_with_schema
        )
        assert len(new_tag_ids) > 0
        assert (
            session_with_schema.query(TaggedObject)
            .filter_by(object_id=object_id, object_type=object_type)
            .count()
            > 0
        )

    session_with_schema.query(TaggedObject).filter_by(
        object_id=object_id, object_type=object_type
    ).delete()
    session_with_schema.commit()

    with patch.object(feature_flag_manager, "is_feature_enabled", return_value=False):
        new_tag_ids_disabled = import_tag(
            ["tag_1"], contents, object_id, object_type, session_with_schema
        )
        assert len(new_tag_ids_disabled) == 0
        associated_tags = (
            session_with_schema.query(TaggedObject)
            .filter_by(object_id=object_id, object_type=object_type)
            .all()
        )
        assert len(associated_tags) == 0
