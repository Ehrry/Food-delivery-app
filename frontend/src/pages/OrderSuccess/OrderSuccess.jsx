import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./OrderSuccess.css";

const OrderSuccess = () => {
  const navigate = useNavigate();
  const { state } = useLocation();

  useEffect(() => {
    // If we do not have order details, bounce home immediately.
    if (!state?.orderId) {
      navigate("/", { replace: true });
    }
  }, [navigate, state]);

  if (!state?.orderId) {
    return null;
  }

  return (
    <div className="order-success">
      <div className="order-success-card">
        <div className="success-icon" aria-hidden="true">
          <span className="checkmark">✓</span>
          <span className="sparkle sparkle-1" />
          <span className="sparkle sparkle-2" />
          <span className="sparkle sparkle-3" />
          <span className="sparkle sparkle-4" />
          <span className="sparkle sparkle-5" />
        </div>
        <h1>Thank you for ordering!</h1>
        <p className="muted">
          Your order is confirmed. You can view the receipt or head back home.
        </p>

        <div className="cta-row">
          <button
            type="button"
            className="ghost-btn"
            onClick={() => navigate("/displayOrder", { replace: true })}
          >
            View order
          </button>
          <button
            type="button"
            className="primary-btn"
            onClick={() => navigate("/", { replace: true })}
          >
            Back to home
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
