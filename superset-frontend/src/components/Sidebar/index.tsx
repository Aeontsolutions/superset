import React, { useEffect, useState } from 'react';
import { Layout, Menu, Button } from 'antd';
import { SiderProps } from 'antd/lib/layout';
import { BootstrapUser } from 'src/types/bootstrapTypes';
import {
  createErrorHandler,
  getRecentActivityObjs,
  getUserOwnedObjects,
} from 'src/views/CRUD/utils';
import SubMenu from 'antd/lib/menu/SubMenu';
import { ActivityData } from 'src/views/CRUD/welcome/Welcome';
import { t } from '@superset-ui/core';
import { Link } from 'react-router-dom';
import CertifiedBadge from 'src/components/CertifiedBadge';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import Loading from '../Loading';
import { addDangerToast } from '../MessageToasts/actions';
import { Tooltip } from '../Tooltip';
import './Sidebar.less';

const { Sider } = Layout;

interface SideBarProps extends SiderProps {
  user: BootstrapUser;
  width: number;
  toggleSideBarWidth: () => void;
  sideBarVisible: boolean;
}

export default function SideBar(props: SideBarProps) {
  const { user, sideBarVisible, toggleSideBarWidth, width, ...restProps } =
    props;
  const userid = user?.userId;
  const id = userid!.toString();
  const recent = `/superset/recent_activity/${user?.userId}/?limit=6`;
  const [dashboardData, setDashboardData] = useState<Array<object> | null>(
    null,
  );
  const [chartData, setChartData] = useState<Array<object> | null>(null);
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  // const [sidebarWidth, setSidebarWidth] = useState(225);
  // const [sidebarVisible, setSidebarVisible] = useState(true);

  useEffect(() => {
    getRecentActivityObjs(userid!, recent, addDangerToast, [])
      .then(res => {
        console.log(res);
        // const data: ActivityData | null = {};
        // data.Examples = res.examples;
        setActivityData(activityData => ({ ...activityData }));
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
    getUserOwnedObjects(id, 'chart')
      .then(r => {
        setChartData(r);
      })
      .catch((err: unknown) => {
        setChartData([]);
        console.error(err);
      });
  }, []);

  // const isRecentActivityLoading = !activityData?.Examples;

  // const handleToggleSidebar = () => {
  //   props.toggleSideBarWidth;
  //   setSidebarVisible(!sidebarVisible);
  // };

  // Render wide sidebar menu
  const renderWideMenu = () => (
    <>
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
      <Menu
        defaultOpenKeys={['sub1']}
        defaultSelectedKeys={['dashboard']}
        mode="inline"
        inlineIndent={10}
        theme="light"
      >
        <SubMenu
          key="sub1"
          title={
            <span>
              <i className="fa fa-fw fa-dashboard" />
              <span>Dashboards</span>
            </span>
          }
        >
          {[...(dashboardData || []), ...[]]
            .filter((dashboard: any) => dashboard.dashboard_title !== undefined)
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
        <SubMenu
          key="sub2"
          title={
            <span>
              <i className="fa fa-fw fa-bar-chart" />
              <span>Charts</span>
            </span>
          }
        >
          {[...(chartData || []), ...[]]
            .filter((chart: any) => chart.slice_name !== undefined)
            .map((chart: any) => (
              <Menu.Item
                isSelected={parseInt(chart?.id, 10) === 10}
                key={chart?.id}
                title={chart?.slice_name}
              >
                <a
                  href={chart?.url}
                  data-test={`${chart?.slice_name}-list-chart-title`}
                >
                  {chart?.certified_by && (
                    <>
                      <CertifiedBadge
                        certifiedBy={chart?.certified_by}
                        details={chart?.certification_details}
                      />{' '}
                    </>
                  )}
                  {chart?.slice_name}
                </a>
              </Menu.Item>
            ))}
        </SubMenu>
        <SubMenu
          key="sub3"
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

  // Render narrow sidebar menu with hover effect
  const renderNarrowMenu = () => (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: '50px',
          maxWidth: '148px',
          marginInline: 'auto',
          marginBlock: '1rem',
          textAlign: 'center',
        }}
      >
        <Link
          className="navbar-brand"
          style={{ display: 'block', height: '100', padding: '0px' }}
          to="/superset/welcome/"
        >
          <img
            height={100}
            style={{ height: '100%', objectFit: 'contain', marginLeft: '10px' }}
            src="/static/assets/images/aeon-logo.png"
            alt="Aeon Technology Solutions"
          />
        </Link>
      </div>
      <Menu mode="vertical" theme="light" className="narrow-menu">
        <SubMenu
          key="sub1"
          title={
            <span>
              <i className="fa fa-fw fa-dashboard" />
            </span>
          }
        >
          <Menu.ItemGroup key="group1" title="Dashboards">
            {[...(dashboardData || []), ...[]]
              .filter(
                (dashboard: any) => dashboard.dashboard_title !== undefined,
              )
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
          </Menu.ItemGroup>
        </SubMenu>
        <SubMenu
          key="sub2"
          title={
            <span>
              <i className="fa fa-fw fa-bar-chart" />
            </span>
          }
        >
          <Menu.ItemGroup key="group2" title="Charts">
            {[...(chartData || []), ...[]]
              .filter((chart: any) => chart.slice_name !== undefined)
              .map((chart: any) => (
                <Menu.Item
                  isSelected={parseInt(chart?.id, 10) === 10}
                  key={chart?.id}
                  title={chart?.slice_name}
                >
                  <a
                    href={chart?.url}
                    data-test={`${chart?.slice_name}-list-chart-title`}
                  >
                    {chart?.certified_by && (
                      <>
                        <CertifiedBadge
                          certifiedBy={chart?.certified_by}
                          details={chart?.certification_details}
                        />{' '}
                      </>
                    )}
                    {chart?.slice_name}
                  </a>
                </Menu.Item>
              ))}
          </Menu.ItemGroup>
        </SubMenu>

        <SubMenu
          key="sub3"
          title={
            <span>
              <i className="fa fa-fw fa-sliders" />
            </span>
          }
        >
          <Menu.ItemGroup key="group3" title="SQL Lab">
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
        </SubMenu>
        <SubMenu
          key="sub4"
          title={
            <span>
              <i className="fa fa-fw fa-database" />
            </span>
          }
        >
          <Menu.ItemGroup key="group4" title="Data">
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
          <Menu.ItemGroup key="group5" title="Resources">
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
          </Menu.ItemGroup>
        </SubMenu>
      </Menu>
    </>
  );

  return (
    <Sider {...restProps} width={width} className="custom-scrollbar">
      <Button className="toggle-sidebar-button" onClick={toggleSideBarWidth}>
        {sideBarVisible ? <LeftOutlined /> : <RightOutlined />}
      </Button>

      {!dashboardData ? (
        <Loading position="inline-centered" />
      ) : width === 230 ? (
        // Render wide sidebar menu
        renderWideMenu()
      ) : (
        // Render narrow sidebar menu
        renderNarrowMenu()
      )}
    </Sider>
  );
}
