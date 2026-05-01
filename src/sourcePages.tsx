import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ProjectsPage from './pages/ProjectsPage';
import SchedulePage from './pages/SchedulePage';
import FontOnePage from './pages/FontOnePage';

export const SOURCE_PAGES: Record<string, React.ComponentType> = {
  home: HomePage,
  about: AboutPage,
  projects: ProjectsPage,
  schedule: SchedulePage,
  font1: FontOnePage,
};
