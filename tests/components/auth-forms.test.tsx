import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '../../src/components/auth/LoginForm';
import { RegisterForm } from '../../src/components/auth/RegisterForm';

describe('Componenti di autenticazione', () => {
  describe('LoginForm', () => {
    const mockSubmit = vi.fn();

    beforeEach(() => {
      mockSubmit.mockReset();
    });

    it('Renderizza correttamente in modalità dark', () => {
      render(<LoginForm onSubmit={mockSubmit} isDarkMode={true} />);
      expect(screen.getByTestId('login-form')).toBeInTheDocument();
      expect(screen.getByTestId('username-input')).toBeInTheDocument();
      expect(screen.getByTestId('password-input')).toBeInTheDocument();
      expect(screen.getByTestId('login-button')).toBeInTheDocument();
      expect(screen.getByTestId('register-link')).toBeInTheDocument();
    });

    it('Renderizza correttamente in modalità light', () => {
      render(<LoginForm onSubmit={mockSubmit} isDarkMode={false} />);
      expect(screen.getByTestId('login-form')).toBeInTheDocument();
    });

    it('Mostra un messaggio di errore se presente', () => {
      const errorMessage = 'Credenziali non valide';
      render(<LoginForm onSubmit={mockSubmit} isDarkMode={true} error={errorMessage} />);
      
      expect(screen.getByTestId('login-error')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('Chiama onSubmit quando il form viene inviato', async () => {
      render(<LoginForm onSubmit={mockSubmit} isDarkMode={true} />);
      
      const usernameInput = screen.getByTestId('username-input');
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByTestId('login-button');
      
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith('testuser', 'password123');
      });
    });

    it('Disabilita il pulsante durante il caricamento', async () => {
      // Creiamo una funzione onSubmit che non risolve subito, per simulare un caricamento
      const mockDelayedSubmit = vi.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(resolve, 100);
        });
      });
      
      render(<LoginForm onSubmit={mockDelayedSubmit} isDarkMode={true} />);
      
      const usernameInput = screen.getByTestId('username-input');
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByTestId('login-button');
      
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      // Verificare che il pulsante sia disabilitato e mostri il testo di caricamento
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Accesso in corso...');
    });
  });

  describe('RegisterForm', () => {
    const mockSubmit = vi.fn();

    beforeEach(() => {
      mockSubmit.mockReset();
    });

    it('Renderizza correttamente in modalità dark', () => {
      render(<RegisterForm onSubmit={mockSubmit} isDarkMode={true} />);
      expect(screen.getByTestId('register-form')).toBeInTheDocument();
      expect(screen.getByTestId('username-input')).toBeInTheDocument();
      expect(screen.getByTestId('email-input')).toBeInTheDocument();
      expect(screen.getByTestId('password-input')).toBeInTheDocument();
      expect(screen.getByTestId('fullname-input')).toBeInTheDocument();
      expect(screen.getByTestId('company-input')).toBeInTheDocument();
      expect(screen.getByTestId('register-button')).toBeInTheDocument();
      expect(screen.getByTestId('login-link')).toBeInTheDocument();
    });

    it('Renderizza correttamente in modalità light', () => {
      render(<RegisterForm onSubmit={mockSubmit} isDarkMode={false} />);
      expect(screen.getByTestId('register-form')).toBeInTheDocument();
    });

    it('Mostra un messaggio di errore se presente', () => {
      const errorMessage = 'Email già in uso';
      render(<RegisterForm onSubmit={mockSubmit} isDarkMode={true} error={errorMessage} />);
      
      expect(screen.getByTestId('register-error')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('Chiama onSubmit quando il form viene inviato', async () => {
      render(<RegisterForm onSubmit={mockSubmit} isDarkMode={true} />);
      
      const usernameInput = screen.getByTestId('username-input');
      const fullnameInput = screen.getByTestId('fullname-input');
      const companyInput = screen.getByTestId('company-input');
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByTestId('register-button');
      
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(fullnameInput, { target: { value: 'Test User' } });
      fireEvent.change(companyInput, { target: { value: 'Test Company' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith({
          username: 'testuser',
          fullName: 'Test User',
          company: 'Test Company',
          email: 'test@example.com',
          password: 'password123'
        });
      });
    });

    it('Disabilita il pulsante durante il caricamento', async () => {
      // Creiamo una funzione onSubmit che non risolve subito, per simulare un caricamento
      const mockDelayedSubmit = vi.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(resolve, 100);
        });
      });
      
      render(<RegisterForm onSubmit={mockDelayedSubmit} isDarkMode={true} />);
      
      const usernameInput = screen.getByTestId('username-input');
      const fullnameInput = screen.getByTestId('fullname-input');
      const companyInput = screen.getByTestId('company-input');
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByTestId('register-button');
      
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(fullnameInput, { target: { value: 'Test User' } });
      fireEvent.change(companyInput, { target: { value: 'Test Company' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      // Verificare che il pulsante sia disabilitato e mostri il testo di caricamento
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Registrazione in corso...');
    });

    it('Richiede una password di almeno 8 caratteri', async () => {
      render(<RegisterForm onSubmit={mockSubmit} isDarkMode={true} />);
      
      const passwordInput = screen.getByTestId('password-input');
      expect(passwordInput).toHaveAttribute('minLength', '8');
      
      // Verifica che la spiegazione sia presente
      expect(screen.getByText('La password deve avere almeno 8 caratteri')).toBeInTheDocument();
    });
  });
});
