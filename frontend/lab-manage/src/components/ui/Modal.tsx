import { icons } from "@/components/ui/icons";

// ─── Modal Component ─────────────────────────────────────────────────
export function Modal({ title, onClose, children, footer }: { title: any; onClose: any; children: any; footer?: any }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn-icon" onClick={onClose}>{icons.close}</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
