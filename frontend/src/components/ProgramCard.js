
// ====================================================================================
// FILE: /frontend/src/components/ProgramCard.js (NEW FILE)
// ====================================================================================
import React from 'react';

const ProgramCard = ({ card, onClick, isSelected }) => {
    if (!card) return <div className="w-20 h-28 sm:w-24 sm:h-32 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center text-gray-500 text-xs p-1">Empty Slot</div>;

    let bgColor = 'bg-gray-700';
    let textColor = 'text-gray-200';
    let borderColor = 'border-gray-500';
    let content = card.type || card.id || 'Unknown';

    switch (card.type?.toUpperCase()) {
        case 'MOVE_1': content = 'Move 1'; bgColor = 'bg-green-600'; break;
        case 'MOVE_2': content = 'Move 2'; bgColor = 'bg-green-700'; break;
        case 'MOVE_3': content = 'Move 3'; bgColor = 'bg-green-800'; break;
        case 'BACKUP': content = 'Back Up'; bgColor = 'bg-red-600'; break;
        case 'TURN_LEFT': content = 'Turn L'; bgColor = 'bg-blue-600'; break;
        case 'TURN_RIGHT': content = 'Turn R'; bgColor = 'bg-blue-600'; break;
        case 'U_TURN': content = 'U-Turn'; bgColor = 'bg-yellow-600 text-black'; break;
        default: content = card.type || card.id;
    }
    
    if (isSelected) {
        borderColor = 'border-yellow-400 ring-2 ring-yellow-400';
    }

    return (
        <button 
            onClick={onClick}
            disabled={!onClick}
            className={`w-full h-28 sm:h-32 ${bgColor} ${textColor} rounded-lg shadow-md p-2 flex flex-col justify-between items-center text-center border-2 ${borderColor} ${onClick ? 'hover:shadow-xl transform hover:scale-105 transition-all duration-150 cursor-pointer' : 'cursor-default'}`}
        >
            <div className="text-xs sm:text-sm font-bold flex-grow flex items-center justify-center leading-tight">{content}</div>
            {card.priority !== undefined && <div className="text-xxs sm:text-xs font-semibold bg-black bg-opacity-40 px-1.5 py-0.5 rounded-full mt-1">{card.priority}</div>}
        </button>
    );
};
export default ProgramCard;
