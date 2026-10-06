import React, { useState, useRef, useEffect } from 'react';
import ImportModal from './ImportModal';

export default function Navbar({
    dataMode,
    setDataMode,
    setCesiumLoading,
    onModeChange,
    trackedObjectsCount,
    satellites,
    setSelectedSatId
}) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showImportModal, setShowImportModal] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
                setSearchQuery(''); // clear search when closing
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredSatellites = satellites?.filter(sat => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            sat.name.toLowerCase().includes(query) ||
            sat.id.toString().includes(query)
        );
    });

    return (
        <div className="mc-panel relative">
            <div className="mc-panel-section">
                <span className="mc-sys-id relative">
                    SUDHARSHAN CHAKRA
                    <span className="mc-separator">—</span>
                    <span className="mc-version">MISSION CONTROL v1.0</span>

                    {dataMode === 'tca' && (
                        <button
                            onClick={() => {
                                if (setDataMode) setDataMode('normal');
                                if (onModeChange) onModeChange();
                            }}
                            className="absolute top-[120%] left-0 h-7 px-3 border border-violet-500/50 bg-violet-500/15 text-violet-300 hover:bg-violet-500/30 hover:text-white rounded text-[11px] font-mono transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap w-fit shrink-0"
                        >
                            ← RETURN TO DASHBOARD
                        </button>
                    )}

                    {dataMode === 'hypothetical_tca' && (
                        <button
                            onClick={() => {
                                if (setDataMode) setDataMode('normal');
                                if (onModeChange) onModeChange();
                            }}
                            className="absolute top-[120%] left-0 h-7 px-3 border border-red-500/50 bg-red-900/30 text-red-300 hover:bg-red-800/50 hover:text-white rounded text-[11px] font-mono transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap w-fit shrink-0"
                        >
                            ← RETURN TO DASHBOARD
                        </button>
                    )}

                    {dataMode === 'normal' && (
                        <div 
                            className="absolute top-[120%] left-0 h-auto px-3 py-1.5 border border-red-500/50 bg-red-900/40 text-red-400 rounded-md text-[10px] font-mono shadow-[0_0_15px_rgba(220,38,38,0.2)] backdrop-blur-md flex flex-col items-start w-fit shrink-0 cursor-pointer pointer-events-auto hover:bg-red-800/60 transition-colors"
                            onClick={() => {
                                if (setSelectedSatId) setSelectedSatId('SAT-001');
                            }}
                        >
                            <span className="font-bold tracking-widest text-red-300 mb-0.5">⚠️ HYPOTHETICAL / SIMULATION ⚠️</span>
                            <span className="text-[9px] text-red-400/80 tracking-wide">HUBBLE vs VANGUARD 1 COLLISION SCENARIO</span>
                        </div>
                    )}
                </span>
            </div>

            <div className="mc-panel-section relative flex items-center gap-3 shrink-0" ref={dropdownRef}>
                {dataMode === 'realistic' && (
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="h-7 px-3 border border-violet-500/50 bg-violet-500/15 text-violet-300 hover:bg-violet-500/30 hover:text-white rounded text-[11px] font-mono transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                        <span className="text-xs">⟳</span> IMPORT TLE
                    </button>
                )}

                <span
                    className="mc-readout cursor-pointer hover:text-white transition-colors flex items-center gap-1 text-[11px] font-mono whitespace-nowrap"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                    TRACKED OBJECTS: <span className="mc-readout-value font-semibold text-white ml-0.5">{trackedObjectsCount}</span>
                    <span className="text-[9px] ml-1 text-gray-400">{isDropdownOpen ? '▲' : '▼'}</span>
                </span>
                <span className="mc-readout-divider text-gray-700 mx-1">|</span>
                <span className="mc-status text-[11px] font-mono whitespace-nowrap flex items-center gap-1.5">
                    <span className="mc-status-dot" />
                    SYSTEM NOMINAL
                </span>

                {/* Dropdown Menu */}
                {isDropdownOpen && satellites && (
                    <div
                        className="absolute top-full right-0 mt-2 w-72 max-h-96 flex flex-col bg-[#0d121d]/98 backdrop-blur-xl border border-violet-500/50 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-[99999] p-2 text-left"
                        style={{ pointerEvents: 'auto' }}
                    >
                        <div className="text-[10px] font-mono font-semibold text-violet-400 uppercase tracking-widest mb-2 px-2 pb-1 border-b border-violet-500/20 flex justify-between items-center shrink-0">
                            <span>TRACKED SATELLITES</span>
                            <span className="text-gray-400 font-normal">({filteredSatellites.length})</span>
                        </div>
                        
                        <div className="px-1 mb-2 shrink-0">
                            <input
                                type="text"
                                placeholder="Search name or ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-violet-950/20 border border-violet-500/30 rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-violet-500/60 transition-colors"
                                autoFocus
                            />
                        </div>

                        <div className="flex flex-col gap-1 overflow-y-auto pr-1">
                            {filteredSatellites.length === 0 ? (
                                <div className="text-center text-xs text-gray-500 py-4 font-mono">No satellites found</div>
                            ) : (
                                filteredSatellites.map(sat => (
                                    <button
                                        key={sat.id}
                                        type="button"
                                        className="text-left px-2.5 py-1.5 hover:bg-violet-500/25 rounded text-xs font-mono text-gray-300 hover:text-white transition-colors flex justify-between items-center group cursor-pointer shrink-0"
                                        onClick={() => {
                                            if (setSelectedSatId) setSelectedSatId(sat.id);
                                            setIsDropdownOpen(false);
                                            setSearchQuery('');
                                        }}
                                    >
                                        <span className="truncate pr-2 font-medium">{sat.name}</span>
                                        <span className="text-[9px] text-gray-400 group-hover:text-violet-300 whitespace-nowrap">NORAD {sat.id}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            <ImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
            />
        </div>
    );
}
