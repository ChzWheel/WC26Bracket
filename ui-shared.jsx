// Shared UI components: Flag, TeamChip, Stepper, IconButton, Modal.
// Flags are CSS gradients per the spec — no SVG crests.

const { useState, useEffect, useRef, useMemo, useCallback } = React;

function Flag({ team, w = 22, h = 14, className = '' }) {
  if (!team) {
    return (
      <span className={`flag ${className}`}
        style={{ width: w, height: h, background: 'var(--bg-3)' }} />
    );
  }
  return (
    <span
      className={`fi fi-${team.iso} flag ${className}`}
      style={{ width: w, height: h }}
      aria-label={team.name}
    />
  );
}

function TeamChip({ team, size = 'sm' }) {
  if (!team) return <span className="muted mono" style={{ fontSize: 12 }}>— TBD —</span>;
  const fw = size === 'lg' ? 28 : 22;
  const fh = size === 'lg' ? 18 : 14;
  return (
    <span className="team-chip">
      <Flag team={team} w={fw} h={fh} />
      <span className="name">{team.name}</span>
      <span className="code">{team.code}</span>
    </span>
  );
}

function Stepper({ steps, current }) {
  return (
    <div className="stepper">
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div className={`step ${i === current ? 'active' : ''} ${i < current ? 'done' : ''}`}>
            <span className="dot">{i < current ? '✓' : String(i + 1)}</span>
            <span>{s}</span>
          </div>
          {i < steps.length - 1 && <span className="line" />}
        </React.Fragment>
      ))}
    </div>
  );
}

function Modal({ title, body, onClose, children }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal fade-in" onClick={(e) => e.stopPropagation()}>
        {title && <h3>{title}</h3>}
        {body && <p>{body}</p>}
        {children}
      </div>
    </div>
  );
}

// Small format helpers.
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

Object.assign(window, { Flag, TeamChip, Stepper, Modal, fmtDate });
