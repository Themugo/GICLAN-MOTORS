export default function AddCarStepIndicator({ step, setStep, completed = {} }) {
  const steps = [
    { id: 1, label: 'Basic Info', desc: 'Vehicle details' },
    { id: 2, label: 'Specs', desc: 'Features & specs' },
    { id: 3, label: 'Pricing', desc: 'Price & mode' },
    { id: 4, label: 'Photos', desc: 'Upload images' },
  ];

  return (
    <div style={{ marginBottom: 32 }}>
      {/* Progress bar */}
      <div style={{
        height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2,
        marginBottom: 16, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${(step / 4) * 100}%`,
          background: 'linear-gradient(90deg, var(--gold), #e6c288)',
          transition: 'width 0.3s ease', borderRadius: 2,
        }} />
      </div>

      {/* Step indicators */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {steps.map((s, i) => {
          const isCompleted = completed[s.id] || i + 1 < step;
          const isCurrent = step === s.id;
          const isUpcoming = i + 1 > step;

          return (
            <div key={s.id} onClick={() => setStep(s.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStep(s.id); } }}
              role="tab" aria-selected={isCurrent} tabIndex={0} aria-label={s.label || `Step ${s.id}`}
              style={{
                flex: 1, textAlign: 'center', padding: '12px 8px', borderRadius: 12,
                background: isCurrent ? 'rgba(37, 99, 235,0.12)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isCurrent ? 'rgba(37, 99, 235,0.3)' : isCompleted ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`,
                cursor: isUpcoming ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: isCurrent ? 600 : 500,
                color: isCurrent ? 'var(--gold)' : isCompleted ? '#22C55E' : 'rgba(255,255,255,0.5)',
                transition: 'all 0.2s', opacity: isUpcoming ? 0.5 : 1,
                position: 'relative',
              }}
              onMouseEnter={e => { if (!isUpcoming) { e.currentTarget.style.background = isCurrent ? 'rgba(37, 99, 235,0.18)' : 'rgba(255,255,255,0.05)'; } }}
              onMouseLeave={e => { if (!isUpcoming) { e.currentTarget.style.background = isCurrent ? 'rgba(37, 99, 235,0.12)' : 'rgba(255,255,255,0.02)'; } }}
            >
              {/* Step number with status */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                margin: '0 auto 8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isCurrent ? 'var(--gold)' : isCompleted ? '#22C55E' : 'rgba(255,255,255,0.1)',
                color: isCurrent || isCompleted ? '#000' : 'rgba(255,255,255,0.5)',
                fontWeight: 800, fontSize: 14,
                transition: 'all 0.2s',
              }}>
                {isCompleted ? '✓' : s.id}
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>{s.desc}</div>

              {/* Current step indicator */}
              {isCurrent && (
                <div style={{
                  position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)',
                  width: 4, height: 4, borderRadius: '50%',
                  background: 'var(--gold)',
                  boxShadow: '0 0 8px var(--gold)',
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
