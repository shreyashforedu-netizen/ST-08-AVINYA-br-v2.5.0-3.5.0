import React, { useState, useRef, useEffect } from 'react';

export default function ImportModal({ isOpen, onClose }) {
    const [importGroup, setImportGroup] = useState('ACTIVE');
    const [importLimit, setImportLimit] = useState(40);
    const [isImporting, setIsImporting] = useState(false);
    const [importLogs, setImportLogs] = useState("");
    const terminalRef = useRef(null);

    // Auto scroll terminal
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [importLogs]);

    const handleImport = async () => {
        setIsImporting(true);
        setImportLogs("> Initializing import sequence...\n");
        try {
            const res = await fetch('/api/import-tle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ limit: parseInt(importLimit), group: importGroup })
            });
            
            const reader = res.body.getReader();
            const decoder = new TextDecoder('utf-8');
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                setImportLogs(prev => prev + chunk);
            }
            
            setImportLogs(prev => prev + "\n> IMPORT COMPLETE. CLOSING MODAL...\n");
            
            setTimeout(() => {
                onClose();
                setIsImporting(false);
                setImportLogs("");
            }, 1500);
            
        } catch (e) {
            setImportLogs(prev => prev + `\n> ERROR: ${e.message}\n`);
            setIsImporting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-violet-500/40 rounded-lg p-6 w-full max-w-[500px] shadow-2xl">
                <h2 className="text-violet-400 text-sm font-bold tracking-widest mb-4">IMPORT TLE DATA</h2>
                
                {isImporting || importLogs ? (
                    <div className="mb-6">
                        <div 
                            ref={terminalRef}
                            className="w-full h-48 bg-black border border-gray-700 rounded p-3 overflow-y-auto font-mono text-[10px] text-green-400 whitespace-pre-wrap"
                        >
                            {importLogs}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="mb-4">
                            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">CelesTrak Group</label>
                            <select 
                                value={importGroup}
                                onChange={(e) => setImportGroup(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-xs font-mono text-gray-300 focus:outline-none focus:border-violet-500 transition-colors"
                            >
                                <option value="ACTIVE">Active Satellites</option>
                                <option value="STATIONS">Space Stations (ISS, Tiangong)</option>
                                <option value="WEATHER">Weather Satellites</option>
                                <option value="STARLINK">Starlink</option>
                                <option value="GPS-OPS">GPS Operational</option>
                            </select>
                        </div>

                        <div className="mb-6">
                            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Number of Satellites to process</label>
                            <input 
                                type="number" 
                                value={importLimit}
                                onChange={(e) => setImportLimit(e.target.value)}
                                min="1"
                                max="1000"
                                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-xs font-mono text-gray-300 focus:outline-none focus:border-violet-500 transition-colors"
                            />
                            <p className="text-[9px] text-gray-500 mt-2">
                                Note: Generating full orbital coordinates for hundreds of satellites may take a few seconds in Python.
                            </p>
                        </div>
                    </>
                )}

                <div className="flex justify-end gap-3">
                    <button 
                        onClick={() => {
                            onClose();
                            setImportLogs("");
                        }}
                        className="px-4 py-2 rounded text-xs font-mono text-gray-400 hover:text-white transition-colors"
                        disabled={isImporting}
                    >
                        CANCEL
                    </button>
                    <button 
                        onClick={handleImport}
                        disabled={isImporting}
                        className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-900 rounded text-xs font-mono text-white transition-colors flex items-center gap-2"
                    >
                        {isImporting ? 'RUNNING SGP4...' : 'IMPORT'}
                    </button>
                </div>
            </div>
        </div>
    );
}
