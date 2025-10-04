
import React from 'react';
import { TennisBallIcon } from './icons/TennisBallIcon';

const Loader: React.FC = () => {
    const messages = [
        "Analyzing your stance and setup...",
        "Evaluating your ball toss consistency...",
        "Checking your trophy pose biomechanics...",
        "Measuring racquet drop and swing path...",
        "Pinpointing your contact point...",
        "Assessing your follow-through and balance...",
        "Generating personalized improvement drills...",
    ];

    const [message, setMessage] = React.useState(messages[0]);
    
    React.useEffect(() => {
        let index = 0;
        const intervalId = setInterval(() => {
            index = (index + 1) % messages.length;
            setMessage(messages[index]);
        }, 2500);

        return () => clearInterval(intervalId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl">
      <TennisBallIcon className="w-20 h-20 text-green-400 animate-spin-slow" />
      <h2 className="text-2xl font-bold text-white mt-6">Coach AI is Analyzing...</h2>
      <p className="text-gray-300 mt-2 text-center transition-opacity duration-500 ease-in-out">{message}</p>
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Loader;
