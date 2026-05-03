import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MobileApp from '../../MobileApp';

describe('MobileApp tab navigation', () => {
  it('renders the HOME tab by default', () => {
    render(<MobileApp />);
    // Home page contains "Hi! I'm Jack"
    expect(screen.getByText(/Hi! I'm Jack/i)).toBeInTheDocument();
  });

  it('all four nav tabs are visible', () => {
    render(<MobileApp />);
    expect(screen.getByRole('button', { name: 'HOME' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ABOUT' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PROJECTS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SCHEDULE' })).toBeInTheDocument();
  });

  it('switches to About page when ABOUT tab is clicked', () => {
    render(<MobileApp />);
    fireEvent.click(screen.getByRole('button', { name: 'ABOUT' }));
    expect(screen.getByText(/About me/i)).toBeInTheDocument();
  });

  it('switches to Projects page when PROJECTS tab is clicked', () => {
    render(<MobileApp />);
    fireEvent.click(screen.getByRole('button', { name: 'PROJECTS' }));
    expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument();
  });

  it('switches to Schedule page when SCHEDULE tab is clicked', () => {
    render(<MobileApp />);
    fireEvent.click(screen.getByRole('button', { name: 'SCHEDULE' }));
    // SchedulePage renders a loading or empty-state message
    expect(
      screen.queryByText(/LOADING|UPCOMING SCHEDULE|NO UPCOMING/i)
    ).toBeInTheDocument();
  });

  it('active tab has a green bottom border style', () => {
    render(<MobileApp />);
    const homeTab = screen.getByRole('button', { name: 'HOME' });
    expect(homeTab).toHaveStyle({ borderBottom: '2px solid #16a34a' });
  });

  it('inactive tabs do not have the active green border', () => {
    render(<MobileApp />);
    const aboutTab = screen.getByRole('button', { name: 'ABOUT' });
    expect(aboutTab).not.toHaveStyle({ borderBottom: '2px solid #16a34a' });
  });

  it('navigating back to HOME shows the home page again', () => {
    render(<MobileApp />);
    fireEvent.click(screen.getByRole('button', { name: 'ABOUT' }));
    fireEvent.click(screen.getByRole('button', { name: 'HOME' }));
    expect(screen.getByText(/Hi! I'm Jack/i)).toBeInTheDocument();
  });
});
