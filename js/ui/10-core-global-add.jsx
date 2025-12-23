// ===========================================
// CORE: Global Quick Add Drawer
// ===========================================

const GlobalQuickAdd = ({ isOpen, onAdd }) => {
    const [val, setVal] = React.useState('');
    if (!isOpen) return null;

    const handleSend = () => {
        if (!val.trim()) return;
        onAdd(val);
        setVal('');
    };

    return (
        <div className="global-add-drawer">
            <div style={{ display: 'flex', gap: 8 }}>
                <input
                    className="f-input"
                    autoFocus
                    placeholder="Quick add task..."
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button className="btn-orange" onClick={handleSend}>+</button>
            </div>
        </div>
    );
};

window.GlobalQuickAdd = GlobalQuickAdd;
