
import React from 'react';
import type { Drill } from '../types';
import { TennisBallIcon } from './icons/TennisBallIcon';

interface DrillCardProps {
  drill: Drill;
}

const DrillCard: React.FC<DrillCardProps> = ({ drill }) => {
  return (
    <div className="bg-gray-900/60 p-5 rounded-lg border border-gray-700 hover:border-green-400 transition-all duration-300">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 pt-1">
          <TennisBallIcon className="w-6 h-6 text-green-400" />
        </div>
        <div>
          <h4 className="text-lg font-bold text-green-300">{drill.name}</h4>
          <p className="mt-1 text-gray-300 whitespace-pre-line">{drill.description}</p>
        </div>
      </div>
    </div>
  );
};

export default DrillCard;
