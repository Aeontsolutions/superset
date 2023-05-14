import React from 'react';
import SideBar from '.';

export default {
  title: 'Sidebar',
  component: SideBar,
};

export const InteractiveSideBar = () => <SideBar />;

InteractiveSideBar.story = {
  parameters: {
    knobs: {
      disable: true,
    },
  },
};
