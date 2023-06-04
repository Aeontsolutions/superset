import React from 'react';
import SideBar from '.';

export default {
  title: 'Sidebar',
  component: SideBar,
};

export const InteractiveSideBar = () => (
  <SideBar
    user={undefined}
    width={10}
    toggleSideBarWidth={() => {}}
    sideBarVisible
  />
);

InteractiveSideBar.story = {
  parameters: {
    knobs: {
      disable: true,
    },
  },
};
