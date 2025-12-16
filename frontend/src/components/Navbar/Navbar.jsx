import React, { useContext, useState } from "react";
import { Link } from "react-router-dom"; // add this
import "./Navbar.css";
import { assets } from "../../assets/assets";
import { StoreContext } from "../../context/StoreContext";

const Navbar = ({ setShowLogin }) => {
  const [menu, setMenu] = useState("menu");
  const { getTotalCartAmount } = useContext(StoreContext);

  return (
    <div className="navbar">
      <Link to="/">
        <img src={assets.logo} alt="" className="logo" />
      </Link>

      {/* <ul className="navbar-menu">
        <Link to="/">
          <li
            onClick={() => setMenu("home")}
            className={menu === "home" ? "active" : ""}
          >
            Home
          </li>
        </Link>
        <Link to="">
          <li
            onClick={() => setMenu("menu")}
            className={menu === "menu" ? "active" : ""}
          >
            Menu
          </li>
        </Link>
        <Link to="">
          <li
            onClick={() => setMenu("contact-us")}
            className={menu === "contact-us" ? "active" : ""}
          >
            <a href="#contact-us">contact us</a>
          </li>
        </Link>
      </ul> */}

      <div className="navbar-right">
        <div className="navbar-search-icon">
          <Link to="/orders" className="my-orders">
            My Orders
          </Link>
          <Link to="/cart" className="cart-link">
            <img src={assets.basket_icon} alt="Cart" />
            {getTotalCartAmount() !== 0 && <span className="dot" />}
          </Link>
        </div>
      </div>
    </div>
  );
};
export default Navbar;
