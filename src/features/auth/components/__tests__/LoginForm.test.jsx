// src/features/auth/components/__tests__/LoginForm.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginForm } from '../LoginForm';
import { useAuthStore } from '../../../../store/authStore';

// Mock the auth store
jest.mock('../../../../store/authStore');
const mockLogin = jest.fn();

const MockedLoginForm = () => (
  <BrowserRouter>
    <LoginForm />
  </BrowserRouter>
);

describe('LoginForm', () => {
  beforeEach(() => {
    useAuthStore.mockReturnValue({
      login: mockLogin,
      isLoading: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders login form fields', () => {
    render(<MockedLoginForm />);
    
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('validates required fields', async () => {
    render(<MockedLoginForm />);
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/username is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  test('submits form with valid credentials', async () => {
    mockLogin.mockResolvedValueOnce({ success: true });
    
    render(<MockedLoginForm />);
    
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
      });
    });
  });

  test('displays error message on login failure', async () => {
    const errorMessage = 'Invalid credentials';
    mockLogin.mockRejectedValueOnce(new Error(errorMessage));
    
    render(<MockedLoginForm />);
    
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrongpassword' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
});

// src/components/__tests__/FileDropzone.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { FileDropzone } from '../FileDropzone';

describe('FileDropzone', () => {
  const mockOnFileSelect = jest.fn();

  beforeEach(() => {
    mockOnFileSelect.mockClear();
  });

  test('renders dropzone with correct text', () => {
    render(<FileDropzone onFileSelect={mockOnFileSelect} />);
    
    expect(screen.getByText(/upload pdf document/i)).toBeInTheDocument();
    expect(screen.getByText(/max 10mb/i)).toBeInTheDocument();
  });

  test('validates file type', () => {
    render(<FileDropzone onFileSelect={mockOnFileSelect} />);
    
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByRole('button', { name: /choose file/i })
      .parentElement.querySelector('input[type="file"]');
    
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    expect(screen.getByText(/only pdf files are allowed/i)).toBeInTheDocument();
    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });

  test('validates file size', () => {
    render(<FileDropzone onFileSelect={mockOnFileSelect} maxSize={1024} />);
    
    const largeFile = new File(['x'.repeat(2048)], 'large.pdf', { 
      type: 'application/pdf' 
    });
    
    const input = screen.getByRole('button', { name: /choose file/i })
      .parentElement.querySelector('input[type="file"]');
    
    Object.defineProperty(input, 'files', {
      value: [largeFile],
      writable: false,
    });

    fireEvent.change(input);

    expect(screen.getByText(/file size must be less than/i)).toBeInTheDocument();
    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });

  test('accepts valid PDF file', () => {
    render(<FileDropzone onFileSelect={mockOnFileSelect} />);
    
    const validFile = new File(['pdf content'], 'document.pdf', { 
      type: 'application/pdf' 
    });
    
    const input = screen.getByRole('button', { name: /choose file/i })
      .parentElement.querySelector('input[type="file"]');
    
    Object.defineProperty(input, 'files', {
      value: [validFile],
      writable: false,
    });

    fireEvent.change(input);

    expect(mockOnFileSelect).toHaveBeenCalledWith(validFile);
  });
});
