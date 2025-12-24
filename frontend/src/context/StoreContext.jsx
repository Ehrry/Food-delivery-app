import { createContext, useEffect, useState } from "react";

import { food_list } from "../assets/assets";

export const StoreContext = createContext(null);

const StoreContextProvider = (props) => {
  const [cartItems, setCartItems] = useState({});

  const fetchCartItems = async () => {
    const response = await fetch("http://localhost:5000/cart");
    if (!response.ok) {
      throw new Error("Unable to fetch cart items");
    }

    const data = await response.json();
    const normalizedCart = data.reduce((acc, item) => {
      const key = String(item.product_id);
      acc[key] = item.quantity;
      return acc;
    }, {});

    setCartItems(normalizedCart);
    return data;
  };

  useEffect(() => {
    fetchCartItems().catch((err) =>
      console.error("Initial cart fetch failed:", err)
    );
  }, []);

  const addToCart = async (productId, quantity = 1) => {
    try {
      const response = await fetch("http://localhost:5000/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: productId,
          quantity: quantity,
        }),
      });

      const data = await response.json();
      console.log("Cart Response:", data);

      await fetchCartItems();
      // alert("Added to cart!");
    } catch (error) {
      console.error("Add to cart error:", error);
    }
  };

  const removeFromCart = async (productId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/cart/${productId}/decrement`,
        {
          method: "PATCH",
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Failed to remove item ${productId} from cart: ${errorBody}`
        );
      }

      await fetchCartItems();
    } catch (error) {
      console.error("Remove from cart error:", error);
    }
  };

  const deleteCartItem = async (productId) => {
    try {
      const response = await fetch(`http://localhost:5000/cart/${productId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Failed to delete item ${productId} from cart: ${errorBody}`
        );
      }

      await fetchCartItems();
    } catch (error) {
      console.error("Delete from cart error:", error);
    }
  };

  const getTotalCartAmount = () => {
    let totalAmount = 0;
    for (const item in cartItems) {
      if (cartItems[item] > 0) {
        let itemInfo = food_list.find((product) => product._id === item);
        totalAmount += itemInfo.price * cartItems[item];
      }
    }
    return totalAmount;
  };

  const contextValue = {
    food_list,
    cartItems,
    setCartItems,
    addToCart,
    removeFromCart,
    deleteCartItem,
    getTotalCartAmount,
    fetchCartItems,
  };
  return (
    <StoreContext.Provider value={contextValue}>
      {props.children}
    </StoreContext.Provider>
  );
};

export default StoreContextProvider;
