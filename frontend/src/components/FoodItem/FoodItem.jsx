import React, { useContext, useState, useEffect } from "react";
import "./FoodItem.css";
import { assets } from "../../assets/assets";
import { StoreContext } from "../../context/StoreContext";
import { useNavigate } from "react-router-dom";

const FoodItem = ({ id, price, description, image }) => {
  const { cartItems, addToCart } = useContext(StoreContext);
  const [updating, setUpdating] = useState(false);
  const navigate = useNavigate();

  const normalizedId = String(id);
  const count = cartItems[id] ?? cartItems[normalizedId] ?? 0;

  // Local quantity state for selection (not in cart yet)
  const [localQuantity, setLocalQuantity] = useState(1);
  const [showCounter, setShowCounter] = useState(false);

  // Update local quantity when cart count changes (if item was just added/removed from cart)
  useEffect(() => {
    if (count === 0) {
      setLocalQuantity(1);
      setShowCounter(false);
    }
  }, [count]);

  // Handle initial + sign click - show counter starting at 1
  const handleInitialAdd = () => {
    setLocalQuantity(1);
    setShowCounter(true);
  };

  // Handle local quantity increase (doesn't add to cart)
  const handleIncreaseQuantity = () => {
    setLocalQuantity((prev) => prev + 1);
  };

  // Handle local quantity decrease (doesn't remove from cart)
  const handleDecreaseQuantity = () => {
    setLocalQuantity((prev) => {
      const newQuantity = prev - 1;
      if (newQuantity <= 0) {
        setShowCounter(false);
        return 0;
      }
      return newQuantity;
    });
  };

  // Handle adding to cart with the selected quantity
  const handleAddToCart = async () => {
    if (updating || localQuantity <= 0) return;
    setUpdating(true);
    try {
      await addToCart(normalizedId, localQuantity);
      setLocalQuantity(1); // Reset to 1 after adding
      setShowCounter(false); // Hide counter after adding
    } catch (err) {
      console.error("Add to cart failed:", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleBuyNow = async () => {
    if (updating) return;
    setUpdating(true);
    try {
      // Ensure item is in cart with selected quantity before navigating
      if (count === 0) {
        await addToCart(normalizedId, localQuantity);
      }
      // Navigate to order page
      navigate("/order");
    } catch (err) {
      console.error("Buy now failed:", err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="food-item">
      <div className="food-item-img-container">
        <img className="food-item-image" src={image} alt="" />
        {!showCounter ? (
          <img
            className="add"
            onClick={handleInitialAdd}
            src={assets.add_icon_white}
            alt=""
          />
        ) : (
          <div className="food-item-counter">
            <img
              onClick={handleDecreaseQuantity}
              src={assets.remove_icon_red}
              alt=""
            />
            <p>{localQuantity}</p>
            <img
              onClick={handleIncreaseQuantity}
              src={assets.add_icon_green}
              alt=""
            />
          </div>
        )}
      </div>
      <div className="foood-item-info">
        {/* <div className="food-item-name-rating">
          <p>{name}</p>
          <img src={assets.rating_starts} alt="" />
        </div> */}
        <p className="food-item-desc">{description}</p>
        <p className="food-item-price">${price}</p>
        {showCounter && localQuantity > 0 && (
          <>
            <button
              className="add-to-cart-button"
              onClick={handleAddToCart}
              disabled={updating}
            >
              Add to Cart ({localQuantity})
            </button>
            <button
              className="buy-now-button"
              onClick={handleBuyNow}
              disabled={updating}
            >
              Buy Now
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default FoodItem;
