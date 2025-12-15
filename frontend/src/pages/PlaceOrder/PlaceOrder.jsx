import React, { useContext } from "react";
import "./PlaceOrder.css";
import { StoreContext } from "../../context/StoreContext";

const PlaceOrder = () => {
  const { getTotalCartAmount } = useContext(StoreContext);
  const subtotal = getTotalCartAmount();
  const deliveryFee = subtotal === 0 ? 0 : 2;
  const total = subtotal === 0 ? 0 : subtotal + deliveryFee;

  return (
    <form className="place-order">
      <div className="place-order-grid">
        <section className="place-order-card info-card">
          <header className="card-header">
            <div>
              <h2>Where should we send your order?</h2>
              <p className="muted">
                Keep your delivery details clear so the courier can find you
                without calling.
              </p>
            </div>
          </header>

          <div className="form-grid">
            <label>
              First name
              <input type="text" placeholder="Jane" />
            </label>
            <label>
              Last name
              <input type="text" placeholder="Doe" />
            </label>
            <label className="full">
              Email address
              <input type="email" placeholder="jane.doe@email.com" />
            </label>
            <label className="full">
              Street address
              <input type="text" placeholder="123 Market St, Apt 4B" />
            </label>
            <label>
              City
              <input type="text" placeholder="San Francisco" />
            </label>
            <label>
              State
              <input type="text" placeholder="CA" />
            </label>
            <label>
              Zip code
              <input type="text" placeholder="94103" />
            </label>
            <label>
              Country
              <input type="text" placeholder="United States" />
            </label>
            <label className="full">
              Phone
              <input type="text" placeholder="+1 (555) 123-4567" />
            </label>
          </div>
        </section>

        <section className="place-order-card summary-card">
          <header className="card-header">
            <div>
              <h2>Order summary</h2>
              <p className="muted">
                Make sure everything looks right before checkout.
              </p>
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

          <button type="submit" className="checkout-btn">
            Proceed to checkout
          </button>
        </section>
      </div>
    </form>
  );
};

export default PlaceOrder;
