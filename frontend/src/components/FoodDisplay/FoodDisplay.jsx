import React, { useState, useEffect } from "react";
import "./FoodDisplay.css";
import FoodItem from "../FoodItem/FoodItem";

const FoodDisplay = ({ category }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchItems = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:5000/products", {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const data = await res.json();
        setItems(data || []);
      } catch (err) {
        if (err.name !== "AbortError")
          setError(err.message || "Error fetching items");
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
    return () => controller.abort();
  }, []);

  const visible = items.filter(
    (item) => category === "All" || category === item.category
  );
  console.log(visible);

  return (
    <div className="food-display" id="food-display">
      <h2>Top dishes near you</h2>

      {loading ? (
        <div className="food-display-loading">Loading...</div>
      ) : error ? (
        <div className="food-display-error">Error: {error}</div>
      ) : (
        <div className="food-display-list">
          {visible.map((item, index) => (
            <FoodItem
              key={item.id ?? item._id ?? index}
              id={item.id ?? item._id}
              name={item.name}
              description={item.description}
              price={item.price}
              image={item.image_url}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FoodDisplay;
