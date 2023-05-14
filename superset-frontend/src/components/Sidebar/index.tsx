import React, { useEffect, useState } from 'react';
import { Layout, Menu } from 'antd';
import { SiderProps } from 'antd/lib/layout';
import { BootstrapUser } from 'src/types/bootstrapTypes';
import {
  createErrorHandler,
  getRecentAcitivtyObjs,
  getUserOwnedObjects,
} from 'src/views/CRUD/utils';
import SubMenu from 'antd/lib/menu/SubMenu';
import { ActivityData } from 'src/views/CRUD/welcome/Welcome';
import { t } from '@superset-ui/core';
import { Link } from 'react-router-dom';
import Loading from '../Loading';
import { addDangerToast } from '../MessageToasts/actions';
import { Tooltip } from '../Tooltip';

const { Sider } = Layout;

interface SideBarProps extends SiderProps {
  user: BootstrapUser;
}

export default function SideBar(props: SideBarProps) {
  const userid = props.user?.userId;
  const id = userid!.toString();
  const recent = `/superset/recent_activity/${props.user?.userId}/?limit=6`;
  const [dashboardData, setDashboardData] = useState<Array<object> | null>(
    null,
  );
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  useEffect(() => {
    getRecentAcitivtyObjs(userid!, recent, addDangerToast)
      .then(res => {
        const data: ActivityData | null = {};
        data.Examples = res.examples;
        setActivityData(activityData => ({ ...activityData, ...data }));
      })
      .catch(
        createErrorHandler((errMsg: unknown) => {
          setActivityData(activityData => ({ ...activityData, Viewed: [] }));
          addDangerToast(
            t('There was an issue fetching your recent activity: %s', errMsg),
          );
        }),
      );
    getUserOwnedObjects(id, 'dashboard')
      .then(r => {
        setDashboardData(r);
      })
      .catch((err: unknown) => {
        setDashboardData([]);
        console.error(err);
      });
  }, []);
  const isRecentActivityLoading = !activityData?.Examples;
  return (
    <Sider {...props} user={undefined}>
      <Tooltip
        id="brand-tooltip"
        placement="bottomLeft"
        title="Aeon Technology Solutions"
        arrowPointAtCenter
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minHeight: '50px',
            maxWidth: '148px',
            marginInline: 'auto',
            marginBlock: '1rem',
          }}
        >
          <Link
            className="navbar-brand"
            style={{ display: 'block', height: '100', padding: '0px' }}
            to="/superset/welcome/"
          >
            <img
              width={148}
              height={100}
              style={{ height: '100%', objectFit: 'contain' }}
              src="/static/assets/images/superset-logo-horiz.png"
              alt="Aeon Technology Solutions"
            />
          </Link>
        </div>
      </Tooltip>
      {!dashboardData || isRecentActivityLoading ? (
        <Loading position="inline-centered" />
      ) : (
        <Menu
          defaultOpenKeys={['sub1']}
          defaultActiveFirst
          mode="inline"
          inlineIndent={10}
          theme="light"
        >
          {/* loop over dashboard data and create menu item */}
          {/* <Menu.Item key="dashboard">
            <Link to="/dashboard/list/">Dashboard</Link>
          </Menu.Item> */}
          <SubMenu key="sub1" title="Dashboards">
            {[...dashboardData, ...activityData?.Examples]
              .filter(dashboard => dashboard.dashboard_title !== undefined)
              .map((dashboard: any) => (
                <Menu.Item
                  isSelected={parseInt(dashboard?.id, 10) === 10}
                  key={dashboard?.id}
                  title={dashboard?.dashboard_title}
                >
                  <Link to={`/superset/dashboard/${dashboard?.id}`}>
                    {dashboard?.dashboard_title}
                  </Link>
                </Menu.Item>
              ))}
          </SubMenu>
        </Menu>
      )}
    </Sider>
  );
}
