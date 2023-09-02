import { Layout } from 'antd/lib/index';
import { SiderProps } from 'antd/lib/layout/Sider';
import React, { useEffect, useMemo, useState } from 'react';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import SubMenu from 'antd/lib/menu/SubMenu';
import { User } from 'src/types/bootstrapTypes';
import { getUserOwnedObjects } from 'src/views/CRUD/utils';
import './Sidebar.less';
import { SupersetClient, t } from '@superset-ui/core';
import { canUserAccessSqlLab } from 'src/dashboard/util/permissionUtils';
import getBootstrapData from 'src/utils/getBootstrapData';
import { WelcomePageLastTab } from 'src/views/CRUD/welcome/types';
import { useListViewResource } from 'src/views/CRUD/hooks';
import Dashboard from 'src/dashboard/containers/Dashboard';
import Owner from 'src/types/Owner';
import { useQuery } from 'react-query';
import Chart from 'src/types/Chart';
import Button from '../Button';
import CertifiedBadge from '../CertifiedBadge';
import { Menu } from '../Menu';
import { addDangerToast } from '../MessageToasts/actions';

interface SidebarProps extends SiderProps {
  width: number;
  toggleSidebarWidth: () => void;
  sidebarVisible: boolean;
  user: User;
}

interface Dashboard {
  changed_by_name: string;
  changed_by_url: string;
  changed_on_delta_humanized: string;
  changed_by: string;
  dashboard_title: string;
  id: number;
  published: boolean;
  url: string;
  thumbnail_url: string;
  owners: Owner[];
  created_by: object;
}

const { Sider } = Layout;

const bootstrapData = getBootstrapData();

export default function Sidebar(props: SidebarProps) {
  const { width, toggleSidebarWidth, sidebarVisible, user, ...rest } = props;
  useListViewResource<Dashboard>('dashboard', t('dashboard'), addDangerToast);

  const canAccessSqlLab = canUserAccessSqlLab(user);
  const userid = user.userId;
  const id = userid!.toString();
  const logo = '/static/assets/images/superset-logo-horiz.png';
  const [dashboardData, setDashboardData] = useState<Array<object> | null>(
    null,
  );
  const [chartData, setChartData] = useState<Array<object> | null>(null);
  // @ts-ignore
  const [isFetchingActivityData, setIsFetchingActivityData] = useState(true);
  // @ts-ignore
  const [otherTabTitle, otherTabFilters] = useMemo(() => {
    const lastTab = bootstrapData.common?.conf
      .WELCOME_PAGE_LAST_TAB as WelcomePageLastTab;
    const [customTitle, customFilter] = Array.isArray(lastTab)
      ? lastTab
      : [undefined, undefined];
    if (customTitle && customFilter) {
      return [t(customTitle), customFilter];
    }
    if (lastTab === 'all') {
      return [t('All'), []];
    }
    return [
      t('Examples'),
      [
        {
          col: 'created_by',
          opr: 'rel_o_m',
          value: 0,
        },
      ],
    ];
  }, []);

  useEffect(() => {
    if (!otherTabFilters) {
      return;
    }

    Promise.all([
      getUserOwnedObjects(id, 'chart')
        .then(r => {
          setChartData(r);
          return Promise.resolve();
        })
        .catch((err: unknown) => {
          setChartData([]);
          addDangerToast(t('There was an issue fetching your chart: %s', err));
          return Promise.resolve();
        }),
    ]).then(() => {
      setIsFetchingActivityData(false);
    });
  }, [id, otherTabFilters]);
  // @ts-ignore
  const { status, data, error, isFetching } = useQuery(
    ['dashboard'],
    async () => {
      const { json } = await SupersetClient.get({
        endpoint: '/api/v1/dashboard/',
      });
      return json;
    },
  );

  useEffect(() => {
    if (status === 'success') {
      setDashboardData(data?.result);
    } else if (status === 'error') {
      // @ts-expect-error message does not exist on unknown
      addDangerToast(error?.message || 'An error occurred');
    }
    // @ts-expect-error message does not exist on unknown
  }, [status, data, error?.message]);
  const wideMenu = () => (
    <>
      <Link to="/superset/welcome/">
        <div className="navbar-container">
          <img
            src={logo}
            alt="Aeon Technology Solutions"
            className="logo"
            style={{ width: 148, height: 100, objectFit: 'contain' }}
          />
        </div>
      </Link>
      <Menu mode="inline">
        <SubMenu
          title={
            <span>
              <i className="fa fa-fw fa-dashboard" />
              <span>Dashboards</span>
            </span>
          }
        >
          {[...(dashboardData ?? [])]
            .filter(
              (dashboard: Dashboard) =>
                dashboard?.dashboard_title !== undefined,
            )
            .map((dashboard: Dashboard) => (
              <Menu.Item
                key={dashboard?.id}
                title={dashboard?.dashboard_title}
                isSelected={window.location.pathname === dashboard?.url}
                active={window.location.pathname === dashboard?.url}
              >
                <Link to={dashboard.url}>
                  <span>{dashboard.dashboard_title}</span>
                </Link>
              </Menu.Item>
            ))}
        </SubMenu>
        <SubMenu
          title={
            <span>
              <i className="fa fa-fw fa-bar-chart" />
              <span>Charts</span>
            </span>
          }
        >
          {[...(chartData ?? [])]
            .filter((chart: Chart) => chart?.slice_name !== undefined)
            .map((chart: Chart) => (
              <Menu.Item
                key={chart?.id}
                title={chart?.slice_name}
                isSelected={window.location.pathname === chart?.url}
                active={window.location.pathname === chart?.url}
              >
                <Link to={chart.url}>
                  {chart.certified_by && (
                    <>
                      <CertifiedBadge
                        certifiedBy={chart.certified_by}
                        details={chart.certification_details}
                      />
                    </>
                  )}
                  <span>{chart.slice_name}</span>
                </Link>
              </Menu.Item>
            ))}
        </SubMenu>
        <SubMenu
          title={
            <span>
              <i className="fa fa-fw fa-sliders" />
              <span>SQL Lab</span>
            </span>
          }
        >
          <Menu.Item title="SQL Editor">
            <Link to="/superset/sqllab/">SQL Editor</Link>
          </Menu.Item>
          <Menu.Item title="Saved Queries">
            <Link to="/savedqueryview/list/">Saved Queries</Link>
          </Menu.Item>
          <Menu.Item title="Query History">
            <Link to="/superset/sqllab/history">Query History</Link>
          </Menu.Item>
        </SubMenu>
        <SubMenu
          key="sub4"
          title={
            <span>
              <i className="fa fa-fw fa-database" />
              <span>Data</span>
            </span>
          }
        >
          <Menu.Item title="Databases">
            <Link to="/databaseview/list/">Databases</Link>
          </Menu.Item>
          <Menu.Item title="Datasets">
            <Link to="/tablemodelview/list/">Datasets</Link>
          </Menu.Item>
        </SubMenu>
        <SubMenu
          key="sub5"
          title={
            <span>
              <i className="fa fa-fw fa-folder-o" />
              <span>Resources</span>
            </span>
          }
        >
          <Menu.Item title="Jacie (AI Powered Chatbot)">
            <a
              href="https://jse.aeontsolutions.com/"
              target="_blank"
              rel="noopener noreferrer"
              title={t('Jacie Chatbot')}
            >
              Jacie Chatbot
            </a>
          </Menu.Item>
        </SubMenu>
      </Menu>
    </>
  );

  const narrowMenu = () => (
    <>
      <Link to="/superset/welcome/">
        <div className="navbar-container" style={{ marginTop: '23px' }}>
          <img
            src="/static/assets/images/aeon-logo.png"
            alt="Aeon Technology Solutions"
            className="logo"
            style={{ objectFit: 'contain', marginLeft: '10px' }}
          />
        </div>
      </Link>
      <Menu mode="vertical" className="narrow-menu">
        <SubMenu
          title={
            <span>
              <i className="fa fa-fw fa-dashboard" />
            </span>
          }
        >
          <Menu.ItemGroup title="Dashboards">
            {[...(dashboardData ?? [])]
              .filter(
                (dashboard: Dashboard) =>
                  dashboard?.dashboard_title !== undefined,
              )
              .map((dashboard: Dashboard) => (
                <Menu.Item
                  key={dashboard?.id}
                  title={dashboard?.dashboard_title}
                  isSelected={window.location.pathname === dashboard?.url}
                  active={window.location.pathname === dashboard?.url}
                >
                  <Link to={dashboard.url}>
                    <span>{dashboard.dashboard_title}</span>
                  </Link>
                </Menu.Item>
              ))}
          </Menu.ItemGroup>
        </SubMenu>
        <SubMenu
          title={
            <span>
              <i className="fa fa-fw fa-bar-chart" />
            </span>
          }
        >
          <Menu.ItemGroup title="Charts">
            {[...(chartData ?? [])]
              .filter((chart: Chart) => chart?.slice_name !== undefined)
              .map((chart: Chart) => (
                <Menu.Item
                  key={chart?.id}
                  title={chart?.slice_name}
                  isSelected={window.location.pathname === chart?.url}
                  active={window.location.pathname === chart?.url}
                >
                  <Link to={chart.url}>
                    {chart.certified_by && (
                      <CertifiedBadge
                        certifiedBy={chart.certified_by}
                        details={chart.certification_details}
                      />
                    )}
                    <span>{chart.slice_name}</span>
                  </Link>
                </Menu.Item>
              ))}
          </Menu.ItemGroup>
        </SubMenu>
        <SubMenu
          title={
            <span>
              <i className="fa fa-fw fa-sliders" />
            </span>
          }
        >
          {canAccessSqlLab && (
            <Menu.ItemGroup title="SQL Lab">
              <Menu.Item title="SQL Editor">
                <Link to="/superset/sqllab/">SQL Editor</Link>
              </Menu.Item>
              <Menu.Item title="Saved Queries">
                <Link to="/savedqueryview/list/">Saved Queries</Link>
              </Menu.Item>
              <Menu.Item title="Query History">
                <Link to="/superset/sqllab/history">Query History</Link>
              </Menu.Item>
            </Menu.ItemGroup>
          )}
        </SubMenu>
        <SubMenu
          key="sub4"
          title={
            <span>
              <i className="fa fa-fw fa-database" />
            </span>
          }
        >
          <Menu.ItemGroup title="Data">
            <Menu.Item title="Databases">
              <Link to="/databaseview/list/">Databases</Link>
            </Menu.Item>
            <Menu.Item title="Datasets">
              <Link to="/tablemodelview/list/">Datasets</Link>
            </Menu.Item>
          </Menu.ItemGroup>
        </SubMenu>
        <SubMenu
          key="sub5"
          title={
            <span>
              <i className="fa fa-fw fa-folder-o" />
            </span>
          }
        >
          <Menu.Item title="Resources">
            <a
              href="https://jse.aeontsolutions.com/"
              target="_blank"
              rel="noopener noreferrer"
              title={t('Jacie Chatbot')}
            >
              Jacie Chatbot
            </a>
          </Menu.Item>
        </SubMenu>
      </Menu>
    </>
  );

  return (
    <Sider
      className="custom-scrollbar"
      {...rest}
      width={width}
      collapsedWidth={width}
      onCollapse={toggleSidebarWidth}
      collapsed={!sidebarVisible}
      theme="light"
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
      }}
    >
      <Button
        className="toggle-sidebar-button"
        onClick={toggleSidebarWidth}
        icon={
          sidebarVisible || width === 230 ? (
            <MenuFoldOutlined />
          ) : (
            <MenuUnfoldOutlined />
          )
        }
      />
      {width === 230 ? wideMenu() : narrowMenu()}
    </Sider>
  );
}
