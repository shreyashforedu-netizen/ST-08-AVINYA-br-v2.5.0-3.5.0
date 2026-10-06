import sys

# Update GlobeView.jsx
gv_path = r'c:\Users\MANAV\Downloads\ST-08-AVINYA-br-v2.5.0\ST-08-AVINYA-br-v2.5.0\src\components\Globe\GlobeView.jsx'
with open(gv_path, 'r', encoding='utf-8') as f:
    gv = f.read()

gv = gv.replace("import SatelliteCard from '../Satellite/SatelliteCard';", "import SatelliteCard from '../Satellite/SatelliteCard';\nimport SimulationModal from '../Satellite/SimulationModal';")
gv = gv.replace("const [hoveredSatId, setHoveredSatId] = useState(null);", "const [hoveredSatId, setHoveredSatId] = useState(null);\n  const [simulationSat, setSimulationSat] = useState(null);")

card_invocation = "<SatelliteCard satellite={activeSat} onClose={() => { setSelectedSatId(null); setHoveredSatId(null); }} />"
new_card = "<SatelliteCard satellite={activeSat} onClose={() => { setSelectedSatId(null); setHoveredSatId(null); }} onSimulationClick={() => setSimulationSat(activeSat)} />"
gv = gv.replace(card_invocation, new_card)

modal_code = """
      {/* Expanded 3D Simulation View */}
      <SimulationModal
        isOpen={simulationSat !== null}
        satellite={simulationSat}
        onClose={() => setSimulationSat(null)}
      />
"""
gv = gv.replace("{/* Engines */}", modal_code + "\n      {/* Engines */}")

with open(gv_path, 'w', encoding='utf-8') as f:
    f.write(gv)

# Update SatelliteCard.jsx
sc_path = r'c:\Users\MANAV\Downloads\ST-08-AVINYA-br-v2.5.0\ST-08-AVINYA-br-v2.5.0\src\components\Satellite\SatelliteCard.jsx'
with open(sc_path, 'r', encoding='utf-8') as f:
    sc = f.read()

sc = sc.replace("export default function SatelliteCard({ satellite, onClose }) {", "export default function SatelliteCard({ satellite, onClose, onSimulationClick }) {")

button_code = """
            <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
                <button 
                    onClick={onSimulationClick}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded shadow-lg transition-colors cursor-pointer pointer-events-auto"
                >
                    VIEW 3D MODEL
                </button>
            </div>
        </div>
    );
}
"""
sc = sc.replace("        </div>\n    );\n}", button_code)
sc = sc.replace("        </div>\r\n    );\r\n}", button_code)

with open(sc_path, 'w', encoding='utf-8') as f:
    f.write(sc)

print('Success')
