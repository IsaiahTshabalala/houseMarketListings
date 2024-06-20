/**
 * File: ./src/components/MenuBar.js
 * Description: Provide the main menu of the application.
 * Date         Dev  Version  Description
 * 2023/11/09   ITA  1.00     Genesis.
 * 2024/06/18   ITA  1.01     Add the header comment.
 *                            Add moderation menu item.
 */
import { BsPersonFill, BsCompassFill } from 'react-icons/bs';
import { FaRegFlag } from "react-icons/fa";
import { IoSearchSharp } from "react-icons/io5";
import { NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { isSignedIn, isModerator } from '../config/appConfig';
import { w3ThemeD5, selectedItemStyle } from './moreStyles';

function MenuBar() {
    const location = useLocation();
    const [selected, setSelected] = useState(location.pathname);
    const [mod, setMod] = useState(false); // Moderator state.

    function selectItem(path) {
        setSelected(path);
    } // function selectItem(target)

    function isSelected(path) {
        if (path === '/')
            return selected === path;

        return selected.startsWith(path);
    } // function isSelected(target)

    async function moderator() {
        setMod(await isModerator());
    }
    
    useEffect(() => {
        selectItem(location.pathname);
        moderator();
    }, [location.pathname]);

    return (
        // The selectItem function ought to receive the exact description of the item to set, not e.target.name. 
        // Otherwise it won't work consistently.
        <div className='w3-bar w3-theme-d5 w3-padding ' >
            <NavLink id='explore' className='w3-bar-item w3-button w3-mobile w3-round'
                style={(isSelected('/') || isSelected('/explore')) ? selectedItemStyle : null} onClick={e=> selectItem('/')} to='/'>
                <div ><BsCompassFill/></div>
                <div className='w3-tiny'>Explore</div>
            </NavLink>

            <div className='w3-dropdown-hover w3-mobile w3-theme-d5'>
                <button className='w3-button w3-round' style={isSelected('/search')? selectedItemStyle : null}>
                    <div><IoSearchSharp/></div>
                    <div className='w3-tiny' >Search</div>
                </button>
                
                <div    className='w3-dropdown-content w3-bar-block w3-win8-green'>    
                    <NavLink id='allListings' className='w3-bar-item w3-button w3-mobile w3-border'
                        style={isSelected('/search')? selectedItemStyle : w3ThemeD5} onClick={e=> selectItem('/search')} to='/search'>
                        All Listings
                    </NavLink>                
                
                    <NavLink id='offers' className='w3-bar-item w3-button w3-mobile w3-border'
                        style={isSelected('/search/offers')? selectedItemStyle : w3ThemeD5} onClick={e=> selectItem('/search/offers')} to='/search/offers'>
                        Offers
                    </NavLink>                    
                </div>                
            </div>

            {(mod === true)?
                <NavLink id='moderation' className='w3-bar-item w3-button w3-mobile w3-round'
                    style={(isSelected('/moderation') || isSelected('/moderation')) ? selectedItemStyle : null} onClick={e=> selectItem('/moderation')} to='/moderation'>
                    <div ><FaRegFlag/></div>
                    <div className='w3-tiny'>Moderation</div>
                </NavLink>:
                null
            }

            <div className='w3-dropdown-hover w3-mobile w3-theme-d5'>
                <button className='w3-button w3-round' style={isSelected('/my-profile')? selectedItemStyle : null}>
                    <div><BsPersonFill/></div>
                    <div className='w3-tiny' >Profile</div>
                </button>
                
                <div    className='w3-dropdown-content w3-bar-block w3-win8-green'>
                    {isSignedIn() &&
                        <NavLink id='myListings' className='w3-bar-item w3-button w3-mobile w3-border'
                            style={isSelected('/my-profile/listings')? selectedItemStyle : w3ThemeD5} onClick={e=> selectItem('/my-profile/listings')} to='/my-profile/listings'>
                            My Listings
                        </NavLink>
                    }
                    
                    {isSignedIn() &&
                        <NavLink id='myAccount' className='w3-bar-item w3-button w3-mobile w3-border'
                            style={isSelected('/my-profile/account')? selectedItemStyle : w3ThemeD5} onClick={e=> selectItem('/my-profile/account')} to='/my-profile/account'>
                            My Account
                        </NavLink>
                    }
                    
                    {isSignedIn() &&
                        <NavLink className='w3-bar-item w3-button w3-mobile w3-border w3-theme-d5' to='/signout'>
                            Sign Out
                        </NavLink>
                    }

                    {!isSignedIn() &&
                        <NavLink className='w3-bar-item w3-button w3-mobile w3-border w3-theme-d5' to='/signin'>
                            Sign in
                        </NavLink>
                    }
                </div>                
            </div>
        </div> 
    );
} // function MenuBar()

export default MenuBar;
