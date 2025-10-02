import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import VoiceButton from '../components/VoiceButton';
import { useAppStore } from '../store/appStore';

// Mock the audio hook
jest.mock('../hooks/useAudio', () => ({
  useAudio: () => ({
    requestPermission: jest.fn().mockResolvedValue(true),
    startRecording: jest.fn().mockResolvedValue(true),
    stopRecording: jest.fn().mockResolvedValue(true),
    error: null
  })
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    button: 'button',
    svg: 'svg'
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

describe('VoiceButton State Machine', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      conversationState: 'idle',
      isRecording: false,
      isPlaying: false,
      audioPermissionGranted: true,
      audioInitialized: true,
      speechDetected: false
    });
  });

  test('should start in idle state', () => {
    render(<VoiceButton />);

    // Should show initial state
    expect(screen.getByRole('button')).toBeInTheDocument();

    // Tooltip should indicate it's ready to start
    const button = screen.getByRole('button');
    fireEvent.mouseEnter(button);
    expect(screen.getByText('Click to start conversation')).toBeInTheDocument();
  });

  test('should transition from idle to connecting when clicked', () => {
    const { container } = render(<VoiceButton />);
    const button = screen.getByRole('button');

    // Click to start conversation
    fireEvent.click(button);

    // Check that conversation state changed
    const state = useAppStore.getState();
    expect(state.conversationState).toBe('connecting');
  });

  test('should show correct colors for each state', () => {
    const { rerender } = render(<VoiceButton />);

    // Test idle state - should be gray
    let button = screen.getByRole('button');
    expect(button).toHaveClass('bg-gray-500');

    // Test connecting state
    useAppStore.setState({ conversationState: 'connecting' });
    rerender(<VoiceButton />);
    button = screen.getByRole('button');
    expect(button).toHaveClass('bg-cyan-500');

    // Test active state - should have gradient
    useAppStore.setState({ conversationState: 'active' });
    rerender(<VoiceButton />);
    button = screen.getByRole('button');
    expect(button).toHaveClass('bg-gradient-to-r');
    expect(button).toHaveClass('from-cyan-500');
    expect(button).toHaveClass('to-pink-500');
  });

  test('should show correct tooltips for each state', () => {
    render(<VoiceButton />);
    const button = screen.getByRole('button');

    // Test idle state tooltip
    fireEvent.mouseEnter(button);
    expect(screen.getByText('Click to start conversation')).toBeInTheDocument();
    fireEvent.mouseLeave(button);

    // Test connecting state tooltip
    useAppStore.setState({ conversationState: 'connecting' });
    fireEvent.mouseEnter(button);
    expect(screen.getByText('Connecting... Click to cancel')).toBeInTheDocument();
    fireEvent.mouseLeave(button);

    // Test active state tooltip
    useAppStore.setState({ conversationState: 'active' });
    fireEvent.mouseEnter(button);
    expect(screen.getByText('Active conversation - Click to end')).toBeInTheDocument();
    fireEvent.mouseLeave(button);

    // Test thinking state tooltip
    useAppStore.setState({ conversationState: 'thinking' });
    fireEvent.mouseEnter(button);
    expect(screen.getByText('AI thinking... Click to interrupt')).toBeInTheDocument();
  });

  test('should handle right-click for settings in idle state', () => {
    render(<VoiceButton />);
    const button = screen.getByRole('button');

    // Right-click should open settings in idle state
    fireEvent.contextMenu(button);

    // Settings modal should be present (AudioSettings component)
    // Note: This test might need adjustment based on actual AudioSettings implementation
  });

  test('should disable button during initialization', () => {
    useAppStore.setState({
      audioInitialized: false,
      conversationState: 'idle'
    });

    render(<VoiceButton />);
    const button = screen.getByRole('button');

    expect(button).toBeDisabled();
  });

  test('should handle state transitions correctly', () => {
    render(<VoiceButton />);
    const button = screen.getByRole('button');

    // Start from idle
    expect(useAppStore.getState().conversationState).toBe('idle');

    // Click to start conversation
    fireEvent.click(button);
    expect(useAppStore.getState().conversationState).toBe('connecting');

    // Simulate transition to active
    useAppStore.setState({ conversationState: 'active' });

    // Click to end conversation
    fireEvent.click(button);
    expect(useAppStore.getState().conversationState).toBe('idle');
  });
});