/**
 * File: ./src/components/MultiSelectionDropdown2.js
 * --------------------------------------------------------------------------------
 * Description: 
 * Provide a multi-selection, searchable dropdown that takes an array of objects.
 * A developer must specify which field name to use for displaying (the keyName), and which field name  (valueName) to use as value selected.
 * * --------------------------------------------------------------------------------
 * Date       Dev    Version Description
 * 2024/02/07 ITA    1.00    Genesis.
 * 2024/09/18 ITA    1.01    Toggle (add/remove) class name (w3-show) for displaying list items. Remove the style attribute.
 *                           Adjust width and add borders.
 *                           Import context directly. Variable names moved to VarNames object.
 * 2024/10/28 ITA    1.02    Improve the responsiveness of the dropdown.
 */
import PropTypes from 'prop-types';
import { useState, useEffect, memo } from 'react';
import { FaTimes } from 'react-icons/fa';
import { RiArrowDropUpLine, RiArrowDropDownLine } from "react-icons/ri";
import toastifyTheme from './toastifyTheme';
import { toast } from 'react-toastify';
import { useCollectionsContext } from '../hooks/CollectionsProvider';
import '../dropdown.css';

function MultiSelectionDropdown2({
                    label, // label with which to describe the dropdown.
                    collectionName,
                    keyName, // the name of the field that will be used for displaying the list items to the user.
                    valueName, // the name of the field that will be used as the underlying value of each list item.
                    isDisabled = false,
                    onItemsSelected = null
                }) // If provided, use this function for sorting. Otherwise sort by keyName field.
{

    const { getCollectionData, setSelected, getSelected, getMaxNumSelections } = useCollectionsContext();
    const [showItems, setShowItems] = useState(false); // true or false. Show or hide 
    const [list, setList] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [listKey, setListKey] = useState(Math.random());
    const [selectedItemsKey, setSelectedItemsKey] = useState(Math.random);
    const keyStep = 0.000000000001;
    
    useEffect(()=> {
        try {
            setList(getCollectionData(collectionName));
            const selItems = getSelected(collectionName);
            setSelectedItems(selItems);            
        } catch (error) {
            /* Even though the collection name is correct, this error will likely be thrown as the collection may not
               have been set. So this error can be ignored. */
        }
    }, []); // useEffect(()=> {

    function handleSearch(e) {
        setSearchText(e.target.value);
        try {
            const result = getCollectionData(collectionName).filter(item=> {
                                const itemValue = item[keyName].toUpperCase();
                                const targetValue = e.target.value.toUpperCase();
                                return itemValue.includes(targetValue);
                            });
            setList(result);
            showList();
            setListKey(listKey + keyStep);
        } catch (error) {
            toast.error(error, toastifyTheme);
        }
    } // function handleSearch(e)

    function handleItemClick(clickedItem) {

        let updatedItems = selectedItems;

        if (!isSelected(clickedItem)) { // Not amongst selected items
            try {
                let maxSelections = getMaxNumSelections(collectionName); // Get the allowed maximum number of selections.
                
                if (maxSelections !== null && selectedItems.length >= maxSelections) {
                    toast.error(`Up to ${maxSelections} selections allowed!`, toastifyTheme);
                    return;
                } // if (maxSelections !== null && selectedItems.length >= maxSelections)
                
                if (updatedItems.findIndex(item=> {
                    return JSON.stringify(item) === JSON.stringify(clickedItem);
                }) <= 0) {
                    updatedItems.push(clickedItem);
                }

            } catch (error) {
                toast.error(error, toastifyTheme);
            }
        } // if (!isSelected(clickedItem))
        else {  // if (selected(clickedItem)) // Amongst selected items.
            // Remove the item from the selected items.
            updatedItems = updatedItems.filter(item=> {
                return JSON.stringify(item) !== JSON.stringify(clickedItem);
            });    
        } // else
      
        setSelectedItems(updatedItems);
        setSelectedItemsKey(selectedItemsKey + keyStep);
    } // function handleItemClick(clickedItem) {

    function isSelected(item) {
    // Check whether an item is found in the list of selected items.
        return selectedItems.findIndex(selectedItem=> {
            return JSON.stringify(selectedItem) === JSON.stringify(item);
        }) >= 0;
    } // function isSelected(item) {

    function removeItem(itemToRemove) {

        const updatedItems = selectedItems.filter(item=> {
            return JSON.stringify(item) !== JSON.stringify(itemToRemove);
        });
        setSelectedItems(updatedItems);
        setSelectedItemsKey(selectedItemsKey + keyStep);
        try {            
            setSelected(collectionName, updatedItems); // collectionsContext update.
            if (onItemsSelected !== null)
                onItemsSelected();
        } catch (error) {
            toast.error(error, toastifyTheme);
        } // catch

    } // function removeItem(item) {

    function toggleShowList() {
        if (!showItems)
            showList();
        else
            hideList();
    } // function toggleShowList() {

    function hideList() {
        setShowItems(false);
        try {
            setSelected(collectionName, selectedItems);
            const selItems = getSelected(collectionName); // This will retrieve the selected items in sort order.
            setSelectedItems(selItems);
            if (onItemsSelected !== null)
                onItemsSelected();
        } catch (error) {
            toast.error(error, toastifyTheme);
        } // catch(error)
    } // function hideList() {

    function showList() {
        if (list.length > 0)
            setShowItems(true);
    } // function showList() {

    return (
        <div className='w3-border w3-round w3-padding-small w3-margin-small dropdown' style={isDisabled? { pointerEvents: 'none'}: {}}>
            <div className='w3-padding-small'>
                <label htmlFor='searchDropDown'>{label}</label>
                <div className='input-wrapper'>
                    <input className={`w3-input-theme-1 w3-input dropdown-input`}
                            type='text' id='searchDropDown' name='searchDropDown' autoComplete='off'
                            aria-label={`Type to Search for ${label}`} aria-required={true} onChange={e=> handleSearch(e)}
                            onFocus={e=> showList()} placeholder='Type to search' value={searchText} />
                    <div className='w3-xlarge' onClick={e=> toggleShowList(e)}>
                        <b>
                            {!showItems? <RiArrowDropDownLine/> : <RiArrowDropUpLine/>}
                        </b>
                    </div>
                </div>
                <div className='w3-margin-top' key={selectedItemsKey}>
                    {selectedItems.map(item=> {                            
                            return ( 
                                <span className='w3-input-theme-1 w3-padding-small' key={`${item[valueName]}${item[keyName]}`} style={{display: 'inline-block', margin: '4px'}}>
                                    {item[keyName]} <span onClick={e=> removeItem(item)}><FaTimes/></span>
                                </span>
                            );
                        })
                    }
                </div>
            </div>

            <div className=' w3-padding-small'>
                <div className={`w3-input-theme-1 w3-dropdown-content w3-border w3-bar-block ${showItems && 'w3-show'}`} id='dropDown' name='dropDown' aria-label={label} 
                        key={listKey}>
                    {list.map((item)=> {
                                        return (
                                            <div className='w3-bar-item w3-button' key={`${item[valueName]}${item[keyName]}`} aria-label={item[keyName]} >
                                                <input type='checkbox' className='w3-input-theme-1' name={`${item[keyName]}Checkbox`} 
                                                        checked={isSelected(item)} onChange={e=> handleItemClick(item)} value={item[valueName]} />
                                                <label style={{marginLeft: '10px'}} htmlFor={`${item[keyName]}`}>{item[keyName]}</label>
                                            </div>
                                        );
                                    }) // list.map(item=> {
                    }
                    <div className='w3-padding w3-bar-item w3-button'>
                        <button className='w3-margin-small w3-theme-d5 w3-round' title='Done' disabled={list.length === 0} 
                                onClick={e=> hideList()} type='button'>Done</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

MultiSelectionDropdown2.propTypes = {
    label: PropTypes.string.isRequired,
    collectionName: PropTypes.string.isRequired,
    keyName: PropTypes.string.isRequired,
    valueName: PropTypes.string.isRequired,
    isDisabled: PropTypes.bool,
    selectedItem: PropTypes.array,
    onItemsSelected: PropTypes.func
};

export default memo(MultiSelectionDropdown2);