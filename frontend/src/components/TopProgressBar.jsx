import { useEffect } from 'react';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

const TopProgressBar = ({ loading }) => {
  useEffect(() => {
    if (loading) {
      NProgress.start();
    } else {
      NProgress.done();
    }
  }, [loading]);

  return null;
};

export default TopProgressBar;
