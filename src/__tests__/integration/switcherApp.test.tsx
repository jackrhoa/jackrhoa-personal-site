import { describe, it, expect } from 'vitest';
import { render, screen, within, fireEvent, act } from '@testing-library/react';
import App from '../../App';

// ── Helpers ───────────────────────────────────────────────────────────────────

function programLabel() {
  return screen.getByTestId('program-label');
}

function previewBusButton(oneBasedIndex: number) {
  const bus = screen.getByTestId('bus-preview');
  return within(bus).getAllByRole('button')[oneBasedIndex - 1];
}

function programBusButton(oneBasedIndex: number) {
  const bus = screen.getByTestId('bus-program');
  return within(bus).getAllByRole('button')[oneBasedIndex - 1];
}

function cutButton() {
  return screen.getByTestId('cut-transition');
}

function autoButton() {
  return screen.getByTestId('auto-transition');
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Switcher App – initial state', () => {
  it('starts with HOME on program', () => {
    render(<App />);
    expect(programLabel()).toHaveTextContent('HOME');
  });

  it('CUT and AUTO TRANS transition buttons are present', () => {
    render(<App />);
    expect(screen.getByTestId('cut-transition')).toBeInTheDocument();
    expect(screen.getByTestId('auto-transition')).toBeInTheDocument();
  });

  it('renders both PREVIEW and PROGRAM bus rows', () => {
    render(<App />);
    expect(screen.getByTestId('bus-preview')).toBeInTheDocument();
    expect(screen.getByTestId('bus-program')).toBeInTheDocument();
  });

  it('each bus row has 7 source buttons', () => {
    render(<App />);
    const previewButtons = within(screen.getByTestId('bus-preview')).getAllByRole('button');
    const programButtons = within(screen.getByTestId('bus-program')).getAllByRole('button');
    expect(previewButtons).toHaveLength(7);
    expect(programButtons).toHaveLength(7);
  });
});

describe('Switcher App – CUT transition', () => {
  it('pressing CUT with a different preview source changes the program', () => {
    render(<App />);
    // Default: program=HOME(1), preview=ABOUT(2)
    // Select PROJECTS (button 3) as preview
    fireEvent.click(previewBusButton(3));
    fireEvent.click(cutButton());
    expect(programLabel()).toHaveTextContent('PROJECTS');
  });

  it('pressing CUT swaps program into preview slot', () => {
    render(<App />);
    // program=HOME, preview=ABOUT initially
    // Select PROJECTS as preview, then CUT
    fireEvent.click(previewBusButton(3));
    fireEvent.click(cutButton());
    // Old program (HOME) should now be on the preview bus (button 1 selected)
    const previewBus = screen.getByTestId('bus-preview');
    const btn1 = within(previewBus).getAllByRole('button')[0];
    // btn-preview class signals selection; btn1 should now be selected (HOME)
    expect(btn1.className).toContain('btn-preview');
  });

  it('clicking program bus directly cuts that source to air immediately', () => {
    render(<App />);
    fireEvent.click(programBusButton(3));
    expect(programLabel()).toHaveTextContent('PROJECTS');
  });

  it('CUT does not fire when program and preview are the same source', () => {
    render(<App />);
    // Put program and preview on the same source
    fireEvent.click(programBusButton(1));
    fireEvent.click(previewBusButton(1));
    const before = programLabel().textContent;
    fireEvent.click(cutButton());
    expect(programLabel().textContent).toBe(before);
  });
});

describe('Switcher App – AUTO transition', () => {
  it('AUTO TRANS button exists and is not disabled initially', () => {
    render(<App />);
    expect(autoButton()).not.toBeDisabled();
  });

  it('completes transition and updates program after animation', async () => {
    render(<App />);
    // Default: program=HOME, preview=ABOUT — AUTO should take ABOUT to air
    await act(async () => {
      fireEvent.click(autoButton());
      await new Promise(r => setTimeout(r, 1100));
    });
    expect(programLabel()).toHaveTextContent('ABOUT');
  });
});

describe('Switcher App – BKGD / KEY1 next-transition toggles', () => {
  it('BKGD and KEY 1 toggle buttons are rendered', () => {
    render(<App />);
    expect(screen.getByText('BKGD')).toBeInTheDocument();
    expect(screen.getByText('KEY 1')).toBeInTheDocument();
  });
});
