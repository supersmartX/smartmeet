/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UploadModal } from '../../components/dashboard/recordings/UploadModal';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  X: () => <div data-testid="icon-x" />,
  Upload: () => <div data-testid="icon-upload" />,
  FileAudio: () => <div data-testid="icon-file-audio" />,
  AlertCircle: () => <div data-testid="icon-alert-circle" />,
  FileText: () => <div data-testid="icon-file-text" />,
}));

describe('UploadModal', () => {
  const mockOnClose = jest.fn();
  const mockOnUpload = jest.fn();
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onUpload: mockOnUpload,
    isUploading: false,
    uploadStatus: '',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn();
  });

  it('renders correctly when open', () => {
    render(<UploadModal {...defaultProps} />);
    expect(screen.getByText('Upload Recording or Transcript')).toBeInTheDocument();
    expect(screen.getByText(/Audio, Video, PDF, DOC, or Text files supported/i)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<UploadModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Upload Recording or Transcript')).not.toBeInTheDocument();
  });

  it('validates file size (max 500MB) on drop', () => {
    render(<UploadModal {...defaultProps} />);
    const dropzone = screen.getByText(/Click to upload or drag and drop/i).parentElement!;
    
    const largeFile = new File([''], 'large.mp3', { type: 'audio/mpeg' });
    Object.defineProperty(largeFile, 'size', { value: 600 * 1024 * 1024 }); // 600MB

    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [largeFile],
      },
    });

    expect(window.alert).toHaveBeenCalledWith('File size exceeds 500MB limit.');
    expect(screen.queryByText('large.mp3')).not.toBeInTheDocument();
  });

  it('accepts valid file types on drop (.txt, .pdf, audio/*, video/*)', () => {
    render(<UploadModal {...defaultProps} />);
    const dropzone = screen.getByText(/Click to upload or drag and drop/i).parentElement!;
    
    const txtFile = new File(['hello world'], 'test.txt', { type: 'text/plain' });
    
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [txtFile],
      },
    });

    expect(screen.getByText('test.txt')).toBeInTheDocument();
    expect(screen.getByTestId('icon-file-text')).toBeInTheDocument();
  });

  it('rejects invalid file types on drop', () => {
    render(<UploadModal {...defaultProps} />);
    const dropzone = screen.getByText(/Click to upload or drag and drop/i).parentElement!;
    
    const exeFile = new File([''], 'virus.exe', { type: 'application/x-msdownload' });
    
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [exeFile],
      },
    });

    expect(screen.queryByText('virus.exe')).not.toBeInTheDocument();
  });

  it('validates file size on file input change', () => {
    const { container } = render(<UploadModal {...defaultProps} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    
    const largeFile = new File([''], 'large.mp3', { type: 'audio/mpeg' });
    Object.defineProperty(largeFile, 'size', { value: 600 * 1024 * 1024 });

    fireEvent.change(input, { target: { files: [largeFile] } });

    expect(window.alert).toHaveBeenCalledWith('File size exceeds 500MB limit.');
  });

  it('triggers onUpload when "Start Upload" is clicked', async () => {
    const { container } = render(<UploadModal {...defaultProps} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    
    const file = new File(['content'], 'test.mp3', { type: 'audio/mpeg' });
    fireEvent.change(input, { target: { files: [file] } });

    const uploadButton = screen.getByText(/Start Upload & AI Processing/i);
    fireEvent.click(uploadButton);

    expect(mockOnUpload).toHaveBeenCalledWith(file);
    await waitFor(() => {
      expect(screen.queryByText('test.mp3')).not.toBeInTheDocument();
    });
  });

  it('shows uploading state', () => {
    render(<UploadModal {...defaultProps} isUploading={true} uploadStatus="Processing..." />);
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(screen.getByText(/Please keep this window open until complete/i)).toBeInTheDocument();
  });

  it('allows clearing selected file', () => {
    const { container } = render(<UploadModal {...defaultProps} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText('test.txt')).toBeInTheDocument();
    
    const closeButtons = screen.getAllByTestId('icon-x');
    const clearFileBtn = closeButtons[1].parentElement!;
    
    fireEvent.click(clearFileBtn);
    expect(screen.queryByText('test.txt')).not.toBeInTheDocument();
  });
});
