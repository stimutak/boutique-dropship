import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { I18nextProvider } from 'react-i18next';
import ImageUpload from '../../components/admin/ImageUpload';
import i18n from '../../i18n/i18n';
import { configureStore } from '@reduxjs/toolkit';
import adminProductsReducer from '../../store/slices/adminProductsSlice';

// Mock fetch
global.fetch = vi.fn();

const mockStore = configureStore({
  reducer: {
    adminProducts: adminProductsReducer
  }
});

const renderWithProviders = (component) => {
  return render(
    <Provider store={mockStore}>
      <I18nextProvider i18n={i18n}>
        {component}
      </I18nextProvider>
    </Provider>
  );
};

describe('ImageUpload Component', () => {
  let mockOnUploadComplete;

  beforeEach(() => {
    mockOnUploadComplete = vi.fn();
    global.fetch.mockClear();
  });

  it('renders upload button with internationalized text', () => {
    renderWithProviders(
      <ImageUpload onUploadComplete={mockOnUploadComplete} />
    );

    expect(screen.getByText(/upload images/i)).toBeInTheDocument();
  });

  it('allows selecting multiple image files', () => {
    renderWithProviders(
      <ImageUpload onUploadComplete={mockOnUploadComplete} />
    );

    const input = screen.getByTestId('image-upload-input');
    expect(input).toHaveAttribute('multiple');
    expect(input).toHaveAttribute('accept', 'image/*');
  });

  it('shows selected file names before upload', async () => {
    renderWithProviders(
      <ImageUpload onUploadComplete={mockOnUploadComplete} />
    );

    const files = [
      new File(['image1'], 'product1.jpg', { type: 'image/jpeg' }),
      new File(['image2'], 'product2.png', { type: 'image/png' })
    ];

    const input = screen.getByTestId('image-upload-input');
    fireEvent.change(input, { target: { files } });

    await waitFor(() => {
      expect(screen.getByText('product1.jpg')).toBeInTheDocument();
      expect(screen.getByText('product2.png')).toBeInTheDocument();
    });
  });

  it('validates file size limit (5MB per file)', async () => {
    renderWithProviders(
      <ImageUpload onUploadComplete={mockOnUploadComplete} />
    );

    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    
    const input = screen.getByTestId('image-upload-input');
    fireEvent.change(input, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByText(/file too large/i)).toBeInTheDocument();
    });
  });

  it('validates file type (only images)', async () => {
    renderWithProviders(
      <ImageUpload onUploadComplete={mockOnUploadComplete} />
    );

    const textFile = new File(['text'], 'document.txt', { type: 'text/plain' });
    
    const input = screen.getByTestId('image-upload-input');
    fireEvent.change(input, { target: { files: [textFile] } });

    await waitFor(() => {
      expect(screen.getByText(/only image files/i)).toBeInTheDocument();
    });
  });

  it('limits to 10 files maximum', async () => {
    renderWithProviders(
      <ImageUpload onUploadComplete={mockOnUploadComplete} />
    );

    const files = Array.from({ length: 11 }, (_, i) => 
      new File(['image'], `image${i}.jpg`, { type: 'image/jpeg' })
    );

    const input = screen.getByTestId('image-upload-input');
    fireEvent.change(input, { target: { files } });

    await waitFor(() => {
      expect(screen.getByText(/maximum 10 images/i)).toBeInTheDocument();
    });
  });

  it('shows image previews for selected files', async () => {
    renderWithProviders(
      <ImageUpload onUploadComplete={mockOnUploadComplete} />
    );

    const file = new File(['image'], 'preview.jpg', { type: 'image/jpeg' });
    
    // Mock FileReader
    const mockReadAsDataURL = vi.fn();
    const mockReader = {
      readAsDataURL: mockReadAsDataURL,
      result: 'data:image/jpeg;base64,mockdata',
      onload: null
    };
    
    global.FileReader = vi.fn(() => mockReader);
    mockReadAsDataURL.mockImplementation(() => {
      setTimeout(() => {
        if (mockReader.onload) {
          mockReader.onload({ target: { result: 'data:image/jpeg;base64,mockdata' } });
        }
      }, 0);
    });

    const input = screen.getByTestId('image-upload-input');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const preview = screen.getByAltText('preview.jpg');
      expect(preview).toHaveAttribute('src', 'data:image/jpeg;base64,mockdata');
    });
  });

  it('allows removing selected files before upload', async () => {
    renderWithProviders(
      <ImageUpload onUploadComplete={mockOnUploadComplete} />
    );

    const file = new File(['image'], 'removable.jpg', { type: 'image/jpeg' });
    
    const input = screen.getByTestId('image-upload-input');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('removable.jpg')).toBeInTheDocument();
    });

    const removeButton = screen.getByTestId('remove-file-0');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByText('removable.jpg')).not.toBeInTheDocument();
    });
  });

  it('uploads files with progress indication', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        images: [
          { url: '/images/products/123.jpg', filename: '123.jpg' }
        ]
      })
    });

    renderWithProviders(
      <ImageUpload onUploadComplete={mockOnUploadComplete} />
    );

    const file = new File(['image'], 'upload.jpg', { type: 'image/jpeg' });
    
    const input = screen.getByTestId('image-upload-input');
    fireEvent.change(input, { target: { files: [file] } });

    const uploadButton = await screen.findByText(/start upload/i);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText(/uploading/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockOnUploadComplete).toHaveBeenCalledWith([
        { url: '/images/products/123.jpg', filename: '123.jpg' }
      ]);
    });

    // Check FormData was sent correctly
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/products/images',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': expect.stringContaining('Bearer')
        }),
        body: expect.any(FormData)
      })
    );
  });

  it('handles upload errors gracefully', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    renderWithProviders(
      <ImageUpload onUploadComplete={mockOnUploadComplete} />
    );

    const file = new File(['image'], 'error.jpg', { type: 'image/jpeg' });
    
    const input = screen.getByTestId('image-upload-input');
    fireEvent.change(input, { target: { files: [file] } });

    const uploadButton = await screen.findByText(/start upload/i);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
    });

    expect(mockOnUploadComplete).not.toHaveBeenCalled();
  });

  it('shows individual progress for multiple files', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        images: [
          { url: '/images/products/1.jpg', filename: '1.jpg' },
          { url: '/images/products/2.jpg', filename: '2.jpg' }
        ]
      })
    });

    renderWithProviders(
      <ImageUpload onUploadComplete={mockOnUploadComplete} />
    );

    const files = [
      new File(['image1'], 'first.jpg', { type: 'image/jpeg' }),
      new File(['image2'], 'second.jpg', { type: 'image/jpeg' })
    ];
    
    const input = screen.getByTestId('image-upload-input');
    fireEvent.change(input, { target: { files } });

    const uploadButton = await screen.findByText(/start upload/i);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('first.jpg')).toBeInTheDocument();
      expect(screen.getByText('second.jpg')).toBeInTheDocument();
    });
  });

  it('disables upload button during upload', async () => {
    global.fetch.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true, images: [] })
      }), 100))
    );

    renderWithProviders(
      <ImageUpload onUploadComplete={mockOnUploadComplete} />
    );

    const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
    
    const input = screen.getByTestId('image-upload-input');
    fireEvent.change(input, { target: { files: [file] } });

    const uploadButton = await screen.findByText(/start upload/i);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(uploadButton).toBeDisabled();
    });
  });

  it('supports drag and drop for file selection', async () => {
    renderWithProviders(
      <ImageUpload onUploadComplete={mockOnUploadComplete} />
    );

    const dropZone = screen.getByTestId('image-drop-zone');
    const file = new File(['image'], 'dragged.jpg', { type: 'image/jpeg' });

    fireEvent.dragOver(dropZone, {
      dataTransfer: { files: [file] }
    });

    expect(dropZone).toHaveClass('drag-over');

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] }
    });

    await waitFor(() => {
      expect(screen.getByText('dragged.jpg')).toBeInTheDocument();
    });
  });
});