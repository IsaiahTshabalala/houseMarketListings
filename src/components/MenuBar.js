/**
 * File: ./src/components/MenuBar.js
 * Description: Provide the main menu of the application.
 * Date         Dev  Version  Description
 * 2023/11/09   ITA  1.00     Genesis.
 * 2024/06/18   ITA  1.01     Add the header comment.
 *                            Add moderation menu item.
 * 2024/07/01   ITA  1.02     Update route /search to /search/all. So that the /seach menu items are correctly highlighted, per selected item current url.
 * 2024/10/10   ITA  1.03     Search menu item removed. Added about/privacy policy menu items.
 */
import { BsPersonFill, BsCompassFill } from 'react-icons/bs';
import { FaInfo, FaRegFlag } from "react-icons/fa";
import { NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { isSignedIn, isModerator } from '../config/appConfig';
import { w3ThemeD5, selectedItemStyle } from './moreStyles';

function MenuBar() {
    const location = useLocation();
    const [mod, setMod] = useState(false); // Moderator state.

    function isSelected(value) {
        if (value === '/')
            return value === location.pathname;

        return (location.pathname.startsWith(value)) || (location.pathname === value);
    } // function isSelected(target)

    async function moderator() {
        setMod(await isModerator());
    }
    
    useEffect(() => {
        moderator();
    }, []);

    return (
        // The selectItem function ought to receive the exact description of the item to set, not e.target.name. 
        // Otherwise it won't work consistently.
        <div className='w3-bar w3-theme-d5 w3-padding ' >
            <NavLink id='explore' className='w3-bar-item w3-button w3-mobile w3-round'
                style={(isSelected('/') || isSelected('/explore')) ? selectedItemStyle : null} to='/'>
                <div ><BsCompassFill/></div>
                <div className='w3-tiny'>Explore</div>
            </NavLink>

            {(mod === true)?
                <NavLink id='moderation' className='w3-bar-item w3-button w3-mobile w3-round'
                    style={(isSelected('/moderation')) ? selectedItemStyle : null} to='/moderation'>
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
                        <>
                            <NavLink className='w3-bar-item w3-button w3-mobile w3-border'
                                style={isSelected('/my-profile/listings')? selectedItemStyle : w3ThemeD5} to='/my-profile/listings'>
                                My Listings
                            </NavLink>                                        
                    
                            <NavLink className='w3-bar-item w3-button w3-mobile w3-border'
                                style={isSelected('/my-profile/account')? selectedItemStyle : w3ThemeD5} to='/my-profile/account'>
                                My Account
                            </NavLink>
                        
                            <NavLink className='w3-bar-item w3-button w3-mobile w3-border'
                                style={isSelected('/my-profile/privacy')? selectedItemStyle : w3ThemeD5} to='/my-profile/privacy'>
                                Privacy Policy
                            </NavLink>
                        
                            <NavLink className='w3-bar-item w3-button w3-mobile w3-border w3-theme-d5' to='/signout'>
                                Sign Out
                            </NavLink>
                        </>
                    }

                    {!isSignedIn() &&
                        <NavLink className='w3-bar-item w3-button w3-mobile w3-border w3-theme-d5' to='/signin'>
                            Sign in
                        </NavLink>
                    }
                </div>                
            </div>
            {(!isSignedIn()) &&
                <div className='w3-dropdown-hover w3-mobile w3-theme-d5'>
                    <button className='w3-button w3-round' style={isSelected('/about')? selectedItemStyle : null}>
                        <div><FaInfo/></div>
                        <div className='w3-tiny' >About</div>
                    </button>

                    <div className='w3-dropdown-content w3-bar-block w3-win8-green'>                   
                        <NavLink className='w3-bar-item w3-button w3-mobile w3-border'
                            style={isSelected('/about/privacy')? selectedItemStyle : w3ThemeD5} to='/about/privacy'>
                            Privacy Policy
                        </NavLink>
                    </div>
                </div>
            }
        </div> 
    );
} // function MenuBar()

export default MenuBar;
