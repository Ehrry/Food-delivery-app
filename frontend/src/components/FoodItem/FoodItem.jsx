import React, { useContext, useState } from "react";
import "./FoodItem.css";
import { assets } from "../../assets/assets";
import { StoreContext } from "../../context/StoreContext";

const FoodItem = ({ id, name, price, description, image }) => {
  const { cartItems, addToCart, removeFromCart } = useContext(StoreContext);
  const [updating, setUpdating] = useState(false);

  const normalizedId = String(id);
  const count = cartItems[id] ?? cartItems[normalizedId] ?? 0;

  const handleAdd = async () => {
    if (updating) return;
    setUpdating(true);
    try {
      await addToCart(normalizedId);
    } catch (err) {
      console.error("Add to cart failed:", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleRemove = async () => {
    if (updating || count <= 0) return;
    setUpdating(true);
    try {
      await removeFromCart(normalizedId);
    } catch (err) {
      console.error("Remove from cart failed:", err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="food-item">
      <div className="food-item-img-container">
        <img className="food-item-image" src={image} alt="" />
        {!count ? (
          <img
            className="add"
            onClick={handleAdd}
            src={assets.add_icon_white}
            alt=""
          />
        ) : (
          <div className="food-item-counter">
            <img onClick={handleRemove} src={assets.remove_icon_red} alt="" />
            <p>{count}</p>
            <img onClick={handleAdd} src={assets.add_icon_green} alt="" />
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
      </div>
    </div>
  );
};

export default FoodItem;
