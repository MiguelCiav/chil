import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../../../assets/CHIL_LOGO.png';
import { Card, CardBody } from '../../../components';

export interface AuthLayoutProps {
  title: string;
  subtitle: string;
  footerPrompt: string;
  footerLinkLabel: string;
  footerLinkTo: string;
  children: React.ReactNode;
}

/**
 * Shared centered card layout for public authentication routes (`LoginPage`, `RegisterPage`).
 */
export const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  subtitle,
  footerPrompt,
  footerLinkLabel,
  footerLinkTo,
  children
}) => (
  <div className="min-h-[calc(100vh-10rem)] flex flex-col justify-center items-center py-6 px-4 sm:px-6 lg:px-8 font-sans">
    <div className="w-full max-w-md space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center items-center gap-2">
          <img src={logo} alt="Chil Logo" className="h-12 w-auto" />
          <span className="font-display text-2xl font-black text-primary tracking-tight">Chil</span>
        </div>
        <h1 className="text-xl font-bold text-neutral">{title}</h1>
        <p className="text-xs text-neutral/75">{subtitle}</p>
      </div>

      <Card>
        <CardBody className="p-6 sm:p-8 space-y-6">
          {children}

          <div className="text-center pt-2 border-t border-gray-100">
            <p className="text-xs text-neutral/75">
              {footerPrompt}{' '}
              <Link
                to={footerLinkTo}
                className="font-bold text-primary hover:text-primary/80 transition-colors"
              >
                {footerLinkLabel}
              </Link>
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  </div>
);
