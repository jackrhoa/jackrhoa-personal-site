import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ProjectsPage from './pages/ProjectsPage';
import SchedulePage from './pages/SchedulePage';

export const SOURCE_PAGES: Record<string, React.ComponentType> = {
  home: HomePage,
  about: AboutPage,
  projects: ProjectsPage,
  schedule: SchedulePage,
};
