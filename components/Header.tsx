import React from 'react';
import { Link } from 'react-router-dom';
import { FileTextIcon } from './icons/FileTextIcon';

const Header: React.FC = () => {
  return (
    <header className="bg-brand-primary text-white shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/dashboard" className="flex items-center space-x-3">
            <FileTextIcon className="h-8 w-8 text-white" />
            <span className="text-2xl font-bold tracking-tight">Minutes in Action</span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;