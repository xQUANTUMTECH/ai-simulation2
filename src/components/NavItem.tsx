import React from 'react';

interface NavItemProps {
  icon: React.ReactNode;
  text: string;
  active?: boolean;
  onClick: () => void;
  isDarkMode?: boolean;
}

export function NavItem({ icon, text, active = false, onClick, isDarkMode = true }: NavItemProps) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
        active 
          ? 'bg-purple-500 text-white shadow-md transform scale-105' 
          : `text-gray-400 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} hover:text-purple-500`
      }`}
    >
      {icon}
      <span>{text}</span>
    </div>
  );
}