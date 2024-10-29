/**
 * File: ./src/components/Dropdown2.js
 * --------------------------------------------------------------------------------
 * Description: 
 * Provide a single selection, searchable dropdown that takes an array of objects.
 * A developer must specify which field name to use for displaying (the keyName), and which field name to use as value (valueName).
 * * --------------------------------------------------------------------------------
 * Date        Dev    Version Description
 * 2023/12/19  ITA    1.00    Genesis.
 * 2024/06/18  ITA    1.01    Add version number.
 * 2024/07/14  ITA    1.02    Use the underlying field value (valueName) as the key when displaying collection items.
 * 2024/09/17  ITA    1.03    Toggle (add/remove) class name (w3-show) for displaying list items. Remove the extra style attribute.
                              Adjust width and add borders.
                              Import context directly.
* 2024/10/11   ITA   1.04     Reduce the width of the text box so that it appears side by side with the drop-down on even smaller screens.
* 2024/10/28   ITA   1.05     Improve the responsiveness of the dropdown.
 */
import PropTypes from 'prop-types';
import { useEffect, useState, memo } from 'react';
import { RiArrowDropUpLine, RiArrowDropDownLine } from "react-icons/ri";
import { useCollectionsContext } from '../hooks/CollectionsProvider';
import { toast } from 'react-toastify';
import toastifyTheme from './toastifyTheme';
import '../dropdown.css';

function Dropdown2({label, // label with which to describe the dropdown.
                    collectionName,  // Name of the collection from which to display items.
                    keyName, // the name of the field that will be used for displaying the list items to the user.
                    valueName, // the name of the field that will be used as the underlying value of each list item.
                    onItemSelected = null, // Function to be called to alert the parent component on selection of an item.
                    isDisabled=false}) 
{
    const { getCollectionData,
            setSelected,
            getSelected } = useCollectionsContext();

    const [showItems, setShowItems] = useState(null); // true or false. Show or hide dropdown items.
    const [list, setList] = useState([]);
    const [searchText, setSearchText] = useState('');

    async function handleSearch(e) {
        setSearchText(e.target.value);

        try {
            let aList = getCollectionData(collectionName);
            aList = aList.filter(item=> {
                const itemValue = item[keyName].toUpperCase();
                const targetValue = e.target.value.toUpperCase();
                return itemValue.includes(targetValue);
            });
            setList(aList);
            showList();
        } catch (error) {
            toast.error(error, toastifyTheme);
        }
    } // function handleSearch(e)

    function handleItemClick(clickedItem) {
        setSearchText(clickedItem[keyName]);
        setSelected(collectionName, [clickedItem]);

        if (onItemSelected !== null)
            onItemSelected(); // Alert the parent component that a new selection was made.
        
        hideList();
    } // function handleItemClick(e) {

    function toggleShowList() {
        if (!showItems)
            showList();
        else
            hideList();
    } // function toggleShowList() {

    function hideList() {
        setShowItems(false);
    }

    function showList() {
        if (list.length > 0)
            setShowItems(true);
    }

    useEffect(()=> {
        (async ()=> {
            try {
                let result = getCollectionData(collectionName);
                setList(result);
                result = getSelected(collectionName);

                if (result.length > 0)
                    setSearchText(result[0][keyName]);
                else
                    setSearchText(''); // No selected item found.
            } catch (error) {
                toast.error(error, toastifyTheme);
            }
        })();
    }, []); // useEffect(()=> {

    return (
        <div className='w3-border w3-round w3-padding-small dropdown' style={isDisabled? { pointerEvents: 'none'}: {}}>
            <div className='w3-padding-small'>
                <label htmlFor='searchDropDown'>{label}</label>
                <div  className='input-wrapper'>
                    <input className={`w3-input-theme-1 w3-input dropdown-input`}
                            type='text' id='searchDropDown' name='searchDropDown' autoComplete='off'
                            aria-label={`Type to Search for ${label}`} aria-required={true} onChange={e=> handleSearch(e)}
                            disabled={isDisabled}
                            onFocus={e=> showList()}
                            placeholder='Type to search' value={searchText} />
                    <div className='w3-xlarge' onClick={e=> toggleShowList(e)}>
                        <b>
                            {!showItems? <RiArrowDropDownLine/> : <RiArrowDropUpLine/>}
                        </b>
                    </div>
                </div>
            </div>

            <div className='w3-padding-small'>
                <div className={`w3-input-theme-1 w3-dropdown-content w3-bar-block w3-border ${showItems && 'w3-show'}`} id='dropDown' name='dropDown' aria-label={label} >
                    {list.map((item)=> {
                                            return (
                                                <div className='w3-bar-item w3-button' name={item[keyName]} key={item[valueName]} aria-label={item[keyName]} 
                                                     onClick={e=> handleItemClick(item)} onFocus={e=> showList()}>
                                                    {item[keyName]}
                                                </div>
                                            );
                                        }) // list.map((item)=> {
                    }
                </div>
            </div>
        </div>
    );
}

Dropdown2.propTypes = {
    label: PropTypes.string.isRequired,
    keyName: PropTypes.string.isRequired,
    valueName: PropTypes.string.isRequired,
    isDisabled: PropTypes.bool,
    onItemSelected: PropTypes.func
};

export default memo(Dropdown2);