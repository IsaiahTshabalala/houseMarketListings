/**
 * File: ./src/components/Register.js
 * Description: Email sign up page. For users who opt to sign up using email addresses other than Gmail, Facebook and Yahoo.
 * Date         Dev   Version Description
 * 2023/07/27   ITA   1.00    Genesis.
 * 2024/06/18   ITA   1.01    Add the header comment. Improve the appearance of the home and login links to look like buttons.
 */
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from '../config/appConfig';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BiErrorCircle } from 'react-icons/bi';
import { BsCheck } from 'react-icons/bs';
import { useEffect } from 'react';
import { isValidPassword, hasValues } from '../utilityFunctions/commonFunctions';
import toastifyTheme from './toastifyTheme';
import '../w3.css';
import { FaHome } from 'react-icons/fa';

const lodash = require('lodash');

const init = {
  email: '',
  password: '',
  confirmPassword: ''
};

function Register() {
  const [formData, setFormData] = useState(init);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
    
  function handleChange(e) {
    const prev = formData;
    setFormData({...prev, [e.target.name]: e.target.value});
    validate();
  } // function handleChange(e)

  function showErrorIcon(fieldPath) {
    return (
      <>
        {lodash.get(errors, fieldPath) !== undefined?
          <div className='w3-small w3-text-black'><BiErrorCircle/>{errors[fieldPath]}</div>
          :
          <div className='w3-small w3-text-black' style={{opacity: '0'}}>
            <BsCheck/>
          </div>
        }
      </>
    );
  } //  function showErrorIcon(refObj)

  function validate() {
    // Iterate through each form field and validate entries.
    let checkList = {};
    
    if (isValidPassword(formData.password) === false)
      checkList.password = 'Password must be a minimum 6 characters long, and contain at least 1 of each of the uppercase letters, lowercase letters, numbers and symbols. No spaces!';

    if ((formData.confirmPassword !== formData.password))
      checkList.confirmPassword = 'Password confirmation must match with the password!';   
    if ((formData.confirmPassword !== formData.password))
      checkList.confirmPassword = 'Password confirmation must match with the password!';

    setErrors(checkList);    
    return !hasValues(checkList);
  } // function validate()

  async function submitData(e) {
    e.preventDefault();

    if (!validate()) {
      toast.error('Some errors occurred. Please check your input, and try again!', toastifyTheme);
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      navigate('/email-verification-sent');
    } // try
    catch (error) {
      navigate(`/error/${error.code}`);      
    } // catch (error)
  } // async function submitData(e)

  useEffect(() => {
    if (auth.currentUser !== null
        && 'emailVerified' in auth.currentUser) {
      if (auth.currentUser.emailVerified)
        navigate(-1);
      else
        navigate('email-verification-sent');
    }
  }, []);

  return (
      <div className='w3-container'>
        <form className='w3-container' auto-complete='off' onSubmit={submitData}> 
          <h2>Register</h2>

          <div className='w3-padding-small'>
            <label htmlFor='email'>Email</label>
            <input name='email' autoComplete='off' required={true} aria-required={true} maxLength={70} className='w3-input w3-input-theme-1' type='email'
                    aria-label='Email' onChange={handleChange} value={formData.email} />
          </div>

          <div className='w3-padding-small'>
            <label htmlFor='password'>Password</label>
            <input name='password' required={true} aria-required={true} maxLength={25} className='w3-input w3-input-theme-1' type='password' 
                    aria-label='password' onChange={handleChange} value={formData.password} />
            {showErrorIcon('password')}
          </div>

          <div className='w3-padding-small'>
            <label htmlFor='confirmPassword'>Confirm Password</label>
            <input name='confirmPassword' required={true} aria-required={true} maxLength={30} className='w3-input w3-input-theme-1' type='password'
                    aria-label='Confirm password' onChange={handleChange} value={formData.confirmPassword} />
            {showErrorIcon('confirmPassword')}
          </div>
          
          <ToastContainer/>
                    
          <div className='w3-padding'>
            <button className='w3-btn w3-margin-small w3-theme-d5 w3-round' type='submit'>Register</button>
          </div>
          
          <div className='w3-padding'>
            <NavLink className='w3-btn w3-round w3-theme-d5' to='/signin'>Login</NavLink>
            <NavLink className='w3-margin w3-btn w3-round w3-theme-d5' to='/'><FaHome/></NavLink>
          </div>
        </form>

      </div>
  );
}

export default Register;
