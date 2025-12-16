import React, { useContext, useState } from "react";
import "./PlaceOrder.css";
import { StoreContext } from "../../context/StoreContext";
import { useNavigate } from "react-router-dom";

const PlaceOrder = () => {
  const { getTotalCartAmount, fetchCartItems } = useContext(StoreContext);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    phone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const subtotal = getTotalCartAmount();
  const deliveryFee = subtotal === 0 ? 0 : 2;
  const total = subtotal === 0 ? 0 : subtotal + deliveryFee;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (total === 0) {
      setServerMessage("Add at least one item to your cart before ordering.");
      return;
    }

    setIsSubmitting(true);
    setServerMessage("");
    try {
      const response = await fetch("http://localhost:5000/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Unable to place order");
      }

      const data = await response.json();
      await fetchCartItems?.();
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        address: "",
        city: "",
        state: "",
        zip: "",
        country: "",
        phone: "",
      });
      navigate("/order-success", {
        state: {
          orderId: data.orderId,
          total: data.total,
          email: form.email,
          name: `${form.firstName} ${form.lastName}`.trim(),
        },
        replace: true,
      });
    } catch (err) {
      setServerMessage(err.message || "Order failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="place-order" onSubmit={handleSubmit}>
      <div className="place-order-grid">
        <section className="place-order-card info-card">
          <header className="card-header">
            <div>
              <h2>Delivery Information</h2>
            </div>
          </header>

          <div className="form-grid">
            <label>
              First name
              <input
                type="text"
                name="firstName"
                placeholder="Jane"
                value={form.firstName}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Last name
              <input
                type="text"
                name="lastName"
                placeholder="Doe"
                value={form.lastName}
                onChange={handleChange}
                required
              />
            </label>
            <label className="full">
              Email address
              <input
                type="email"
                name="email"
                placeholder="jane.doe@email.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </label>
            <label className="full">
              Street address
              <input
                type="text"
                name="address"
                placeholder="123 Market St, Apt 4B"
                value={form.address}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              City
              <input
                type="text"
                name="city"
                placeholder="San Francisco"
                value={form.city}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              State
              <input
                type="text"
                name="state"
                placeholder="CA"
                value={form.state}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Zip code
              <input
                type="text"
                name="zip"
                placeholder="94103"
                value={form.zip}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Country
              <input
                type="text"
                name="country"
                placeholder="United States"
                value={form.country}
                onChange={handleChange}
                required
              />
            </label>
            <label className="full">
              Phone
              <input
                type="text"
                name="phone"
                placeholder="+1 (555) 123-4567"
                value={form.phone}
                onChange={handleChange}
                required
              />
            </label>
          </div>
        </section>

        <section className="place-order-card summary-card">
          <header className="card-header">
            <div>
              <h2>Order summary</h2>
            </div>
          </header>

          <div className="summary-list">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>${subtotal}</span>
            </div>
            <div className="summary-row">
              <span>Delivery</span>
              <span>${deliveryFee}</span>
            </div>
            <div className="summary-row total">
              <span>Total due</span>
              <span>${total}</span>
            </div>
          </div>

          <button
            type="submit"
            className="checkout-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Placing order..." : "Place order"}
          </button>
          {serverMessage && <p className="muted">{serverMessage}</p>}
        </section>
      </div>
    </form>
  );
};

export default PlaceOrder;
