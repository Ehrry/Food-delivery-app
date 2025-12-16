import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DisplayOrder.css";

const formatCurrency = (value) =>
  Number.parseFloat(value ?? 0)
    .toFixed(2)
    .toString();

const formatDate = (value) => {
  if (!value) return "---";
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch (err) {
    return value;
  }
};

const normalizeImageUrl = (url) => {
  if (!url) return null;
  return url.startsWith("http") ? url : `http://localhost:5000${url}`;
};

const getInitials = (first = "", last = "") => {
  const f = first?.trim()?.[0] || "";
  const l = last?.trim()?.[0] || "";
  return (f + l || "?").toUpperCase();
};

const DisplayOrder = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());

  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:5000/orders");
      if (!res.ok) {
        throw new Error("Unable to fetch orders right now.");
      }
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const skeletons = useMemo(
    () =>
      Array.from({ length: 3 }, (_, idx) => (
        <article className="order-card skeleton-card" key={idx}>
          <div className="skeleton-line wide" />
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <div className="skeleton-block" />
        </article>
      )),
    []
  );

  const hasOrders = orders.length > 0;

  const toggleCard = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="display-order">
      <section className="order-hero">
        <h1>See every order you&apos;ve placed</h1>
      </section>

      {error && <div className="alert error">{error}</div>}

      {loading ? (
        <div className="orders-grid">{skeletons}</div>
      ) : !hasOrders ? (
        <div className="empty-state">
          <div>
            <p className="eyebrow">Nothing here yet</p>
            <h2>Place your first order</h2>
            <p className="muted">
              Once you checkout, your receipts and tracking info will live here.
            </p>
          </div>
          <button
            type="button"
            className="primary-btn"
            onClick={() => navigate("/")}
          >
            Browse menu
          </button>
        </div>
      ) : (
        <div className="orders-grid">
          {orders.map((order) => {
            const isExpanded = expandedIds.has(order.id);
            const arrow = isExpanded ? "\u25B2" : "\u25BC"; // up/down triangles
            const initials = getInitials(order.first_name, order.last_name);
            return (
              <article
                className={`order-card ${
                  isExpanded ? "expanded" : "collapsed"
                }`}
                key={order.id}
              >
                <header className="order-card-header">
                  <div className="customer-meta">
                    <div className="avatar">{initials}</div>
                    <div>
                      <div className="customer-topline">
                        <p className="eyebrow">Order #{order.id}</p>
                        <span className="customer-chip">Customer</span>
                      </div>
                      <h3>
                        {order.first_name} {order.last_name}
                      </h3>
                      <p className="muted small">{order.email}</p>
                      {!isExpanded && (
                        <p className="muted small">{order.phone}</p>
                      )}
                      {isExpanded && (
                        <p className="muted">
                          {order.address}, {order.city}, {order.state}{" "}
                          {order.zip}
                        </p>
                      )}
                    </div>
                  </div>
                </header>

                <div className="order-meta">
                  <div>
                    <span className="label">Placed</span>
                    <strong>{formatDate(order.created_at)}</strong>
                    {isExpanded && (
                      <>
                        <p className="muted small">{order.email}</p>
                        <p className="muted small">{order.phone}</p>
                      </>
                    )}
                  </div>
                  <div className="total-block">
                    {isExpanded ? (
                      <>
                        <div className="summary-row">
                          <span>Subtotal</span>
                          <span>${formatCurrency(order.subtotal)}</span>
                        </div>
                        <div className="summary-row">
                          <span>Delivery</span>
                          <span>${formatCurrency(order.delivery_fee)}</span>
                        </div>
                        <div className="summary-row total">
                          <span>Total</span>
                          <span className="total-highlight">
                            ${formatCurrency(order.total)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="summary-row compact-total">
                        <span style={{ fontWeight: "bold" }}>Total</span>
                        <span className="total-highlight">
                          ${formatCurrency(order.total)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="order-items">
                    <div className="items-header">
                      <h4>Items</h4>
                      <span className="badge-soft">
                        {order.items?.length || 0} item
                        {(order.items?.length || 0) === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="items-list">
                      {(order.items || []).map((item, idx) => (
                        <div
                          className="item-row"
                          key={item.id || `${order.id}-${idx}`}
                        >
                          <div className="item-info">
                            {normalizeImageUrl(item?.image_url) ? (
                              <img
                                src={normalizeImageUrl(item.image_url)}
                                alt={item.name || "Product image"}
                              />
                            ) : (
                              <div className="item-placeholder" />
                            )}
                            <div>
                              <p className="item-name">
                                {item.name || `Product ${item.product_id}`}
                              </p>
                              <p className="muted small">
                                Qty {item.quantity} x $
                                {formatCurrency(item.price)} ea
                              </p>
                            </div>
                          </div>
                          <div className="item-total">
                            ${formatCurrency(item.total_price)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="toggle-row">
                  <button
                    type="button"
                    className={`toggle-btn ${isExpanded ? "open" : ""}`}
                    onClick={() => toggleCard(order.id)}
                    aria-label={isExpanded ? "Collapse order" : "Expand order"}
                  >
                    <span className="chevron">{arrow}</span>
                    {!isExpanded && (
                      <span className="toggle-text">More Details</span>
                    )}
                    {isExpanded && <span className="toggle-text">Hide</span>}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DisplayOrder;
