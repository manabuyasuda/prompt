'use strict';

window.jQuery = window.$ = require('jquery');

import ResizeManager from './module/ResizeManager';
import ScrollManager from './module/ScrollManager';

const resizeManager = new ResizeManager();
const scrollManager = new ScrollManager();

export const mainResizeManager = resizeManager;

(() => {
  $(() => {
    console.log('page loaded');

    resizeManager.add(resized01);
    resizeManager.init();

    scrollManager.add(scroll01);
    scrollManager.init();
  });

  const resized01 = () => {
    console.log('is resized! 01');
  };
  const scroll01 = () => {
    console.log('is scrolled! 01');
  };
})();
