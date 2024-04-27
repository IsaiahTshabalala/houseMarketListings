/**
 * File: ./src/components/MultiSelectionDropdown.js
 * --------------------------------------------------------------------------------
 * Description: 
 * Provide a multi-selection, searchable dropdown that takes an array of primitve types.
 * * --------------------------------------------------------------------------------
 * Date       Dev       Description
 * 2024/02/27 ITA       Genesis.
 */
import PropTypes from 'prop-types';
import { useState, useEffect, useContext, memo } from 'react';
import { FaTimes } from 'react-icons/fa';
import { RiArrowDropUpLine, RiArrowDropDownLine } from "react-icons/ri";
import toastifyTheme from './toastifyTheme';
import { toast } from 'react-toastify';
import { collectionsContext } from '../hooks/CollectionsProvider';

function MultiSelectionDropdown({
                    label, // label with which to describe the dropdown.
                    collectionName,
                    isDisabled = false,
                    onItemsSelected = null
                }) // If provided, use this function for sorting. Otherwise sort by keyName field.
{

    const { getCollectionData, setSelected, getSelected, getMaxNumSelections } = useContext(collectionsContext);
    const [w3ShowList, setW3ShowList] = useState(null); /* Styling to enable the list of items to show or disappear.
                                                           Will alernate between 2 values as the Dropdown gains or losses focus
                                                           And also when an item is selected. */
    const [list, setList] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [listKey, setListKey] = useState(Math.random()); // To be used to cause the re-render of selected items in the drop-down.
    const [selectedItemsKey, setSelectedItemsKey] = useState(Math.random()); // To be used to cause the re-render of the drop-down items.
    const keyStep = 0.001;
    
    useEffect(()=> {
            try {
                setList(getCollectionData(collectionName));
                const selItems = getSelected(collectionName); // Get the collection's selected items.
                setSelectedItems(selItems);
            } catch (error) {
                 // Likely to throw  an error as the collection loads later in the parent component. So just ignore this error.
            }
    }, []); // useEffect(()=> {

    function handleSearch(e) {
        setSearchText(e.target.value);

        try {
            let result = getCollectionData(collectionName).filter(item=> {
                            const itemValue = item.toUpperCase();
                            const targetValue = e.target.value.toUpperCase();
                            return itemValue.includes(targetValue);
                        });
            setList(result);            
        } catch (error) {
            toast.error(error, toastifyTheme);
        } // catch (error) {

        showList();
        setListKey(listKey + keyStep); // Cause re-render of drop-down items.
    } // function handleSearch(e)

    function handleItemClick(clickedItem) {
        let updatedItems = selectedItems;
        if (!isSelected(clickedItem)) {
            try {
                // Get the allowed maximum number of selections.
                const maxSelections = getMaxNumSelections(collectionName);
                if (maxSelections !== null && selectedItems.length >= maxSelections) {
                    toast.error(`Up to ${maxSelections} selections allowed!`, toastifyTheme);
                    return;
                } // if (maxSelections !== null && selectedItems.length >= maxSelections)
    
                updatedItems.push(clickedItem);
            } catch(error) {
                toast.error(error, toastifyTheme);
            }
        } // if (!isSelected(clickedItem)) {
        else { // Remove the item from the selected items.
            updatedItems = updatedItems.filter(item=> {
                return item !== clickedItem;
            });
        } // else

        setSelectedItems(updatedItems);
        setSelectedItemsKey(selectedItemsKey + keyStep);
    } // function handleItemClick(e) {

    function isSelected(item) { 
    // Check whether an item is found in the list of selected items.
        return selectedItems.findIndex(selectedItem=> {
            return selectedItem === item;
        }) >= 0;
    } // function isSelected(item) {

    function removeItem(itemToRemove) {
        const updatedItems = selectedItems.filter(item=> {
            return item !== itemToRemove;
        });
        setSelectedItems(updatedItems);
        setSelectedItemsKey(selectedItemsKey + keyStep);

        try {
            setSelected(collectionName, updatedItems); // collectionsContext update. Set the selected items.

            if (onItemsSelected !== null)
                onItemsSelected();
        } catch (error) {
            toast.error(error, toastifyTheme);
        }
    } // function removeItem(itemToRemove) {

    function toggleShowList() {
        if (w3ShowList === null)
            showList();
        else
            hideList();
    } // function toggleShowList() {

    function hideList() {
        setW3ShowList(null);

        try {            
            setSelected(collectionName, selectedItems);
            setSelectedItems(selectedItems.sort());
            
            if (onItemsSelected !== null)
                onItemsSelected(); 
        } catch (error) {
            toast.error(error, toastifyTheme);            
        }
    } // function hideList() {

    function showList() {
        setW3ShowList(prev=> ({display: 'block'}));
    } // function showList() {

    return (
        <div style={isDisabled? { pointerEvents: 'none'}: {}}>
            <label htmlFor='searchDropDown w3-padding-small'>{label}</label>
            <div className='w3-padding-small'>
                <div className='side-by-side'  style={{width: '80%'}}>
                    <input className={`w3-input-theme-1 w3-input`}
                            type='text' id='searchDropDown' name='searchDropDown' autoComplete='off'
                            aria-label={`Type to Search for ${label}`} aria-required={true} onChange={e=> handleSearch(e)}
                            onFocus={e=> showList()} placeholder='Type to search' value={searchText} />
                </div>
                <div className='w3-xlarge side-by-side' onClick={e=> toggleShowList(e)}>
                    <b>
                        {w3ShowList === null? <RiArrowDropDownLine/> : <RiArrowDropUpLine/>}
                    </b>
                </div>
                <div className='w3-margin-top' key={selectedItemsKey}>
                    {selectedItems.map((item, index)=> {                            
                            return ( 
                                <span className='w3-input-theme-1 w3-padding-small' key={`${index}`} style={{display: 'inline-block', margin: '4px'}}>
                                    {item} <span onClick={e=> removeItem(item)}><FaTimes/></span>
                                </span>
                            );
                        })
                    }
                </div>
            </div>

            <div className=' w3-padding-small'>
                <div className='w3-input-theme-1 w3-dropdown-content w3-border w3-bar-block' id='dropDown' name='dropDown' aria-label={label} 
                        key={listKey} style={w3ShowList}>
                    {list.map((item, index)=> {
                                            return (
                                                <div className='w3-bar-item w3-button' key={`${index}$`} aria-label={item} >
                                                    <input type='checkbox' className='w3-input-theme-1' name={`${item}Checkbox`} 
                                                            checked={isSelected(item)} onChange={e=> handleItemClick(item)} value={item} />
                                                    <label style={{marginLeft: '10px'}} htmlFor={`${item}`}>{item}</label>
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

MultiSelectionDropdown.propTypes = {
    label: PropTypes.string.isRequired,
    collectionName: PropTypes.string.isRequired,
    isDisabled: PropTypes.bool,
    selectedItem: PropTypes.array,
    onItemsSelected: PropTypes.func
};

export default memo(MultiSelectionDropdown);