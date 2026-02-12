/**File: ./src/components/EditField
 * Provide an Edit/Cancel icon that can be clicked to edit or cancel edit of a field.
 * =================================================================================
 * Start Date  End Date     Dev   Description
 * 2026/01/06  2026/01//06  ITA   Genesis
 */
import { useState, useEffect } from 'react';
import { func, bool } from 'prop-types';
import { BsPencilFill } from 'react-icons/bs';
import { MdCancel } from 'react-icons/md';

function EditField({
                        backupCallback, // Function to be called to backup field data, when edit icon is clicked.
                        revertCallback,  // Function to be called to revert field data, when cancel icon is clicked.
                        displayEditIcon = null // If set to true/false, then the display of Edit / Cancel icon is controlled from the parent component.
                    }) {
    const [isEditIcon, setIsEditIcon] = useState(true); // Tells whether the edit icon is displayed. Default: true.
    const [icon, setIcon] = useState();

    useEffect(()=> {
        setIcon(
            (()=> {
                let anIcon;
                if (displayEditIcon === null) {
                    anIcon = isEditIcon?
                        ( <><BsPencilFill/>Edit</> )
                        : ( <><MdCancel/>Cancel Edit</> );
                }
                else {
                    anIcon = displayEditIcon?
                        ( <><BsPencilFill/>Edit</> )
                        : ( <><MdCancel/>Cancel Edit</> );
                }
                return anIcon;
            })()
        );
    }, [isEditIcon, displayEditIcon]);

    function handleClick(e) {
        let tempEdit;
        if (displayEditIcon === null)
            tempEdit = isEditIcon;
        else
            tempEdit = displayEditIcon;

        if (tempEdit) {
            backupCallback();
        }
        else {
            revertCallback();
        }

        if (displayEditIcon === null)
            setIsEditIcon(!isEditIcon); // Toggle between true and false.
    }

    return (
        <span className='w3-btn w3-text-black' onClick={e=> handleClick()}>
            {icon}
        </span>
    );
} // function EditField({

EditField.propTypes = {
    displayEditIcon: bool,
    backupCallback: func.isRequired,
    revertCallback: func.isRequired
}

export default EditField;