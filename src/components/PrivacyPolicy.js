/**File: ./src/components/PrivacyPolicy
 * Description: Display the privacy policy.
 * Date         Dev    Version    Description
 * 20024/10/09  ITA    1.00       Genesis.
 * 
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';

function PrivacyPolicy() {
    const appName = 'House-Market-Listings';
    const contactEmail = process.env.REACT_APP_CONTACT_EMAIL;
    const effectiveDate = (new Date('2024-10-09')).toString();

    return (
        <div className='w3-containter'>
            <div className='w3-input-theme-1 w3-padding'>
                <h1>Privacy Policy</h1>

                <p><strong>Effective Date:</strong> {effectiveDate}</p>

                <p>Welcome to {appName}! At {appName}, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you use our house-market-listings platform.</p>

                <h2>1. Information We Collect</h2>
                <p>When you use our app, we may collect the following types of information:</p>
                <ul>
                    <li><strong>Account Information:</strong> When you sign up or log in, we collect information such as your email address, username, and password.</li>
                    <li><strong>Property Listings Information:</strong> We collect details related to the property, such as location, property type, transaction type, and other listing-specific data.</li>
                    <li><strong>Communication Data:</strong> (Future feature) We may collect communication-related data if communication features are added in the future.</li>
                    <li><strong>Technical Information:</strong> We may collect technical data about your device, including your IP address, browser type, and operating system.</li>
                </ul>

                <h2>2. How We Use Your Information</h2>
                <p>We use the information we collect for the following purposes:</p>
                <ul>
                    <li>To provide and improve the app's functionality.</li>
                    <li>To manage user accounts and verify user identity.</li>
                    <li>To ensure the security and integrity of the app.</li>
                    <li>To analyze user activity and improve app performance.</li>
                </ul>

                <h2>3. Data Storage and Security</h2>
                <p>Your data is stored securely in our Firestore database, provided by Google Firebase. We take appropriate measures to protect your data against unauthorized access, loss, or alteration.</p>

                <h2>4. Use of Cookies and Local Storage</h2>
                <p>We do not use cookies for tracking purposes. However, we may use localStorage and IndexedDB to store non-personalized settings or temporary session data to enhance your app experience. You can manage localStorage and browser settings via your browser’s preferences.</p>

                <h2>5. Data Sharing</h2>
                <p>We do not share your personal information with third parties except in the following cases:</p>
                <ul>
                    <li>When required by law.</li>
                    <li>To protect the rights, property, or safety of {appName}, our users, or others.</li>
                    <li>To comply with legal obligations or court orders.</li>
                </ul>

                <h2>6. Your Rights</h2>
                <ul>
                    <li><strong>Access and Correction:</strong> You have the right to access and update your personal information within your account settings.</li>
                    <li><strong>Deletion:</strong> You can request the deletion of your account and associated data at any time by contacting us.</li>
                    <li><strong>Data Portability:</strong> Upon request, we can provide a copy of your data in a structured, machine-readable format.</li>
                </ul>

                <h2>7. Changes to the Privacy Policy</h2>
                <p>We may update this Privacy Policy from time to time to reflect changes in our practices or applicable law. We encourage you to review this policy periodically.</p>

                <h2>8. Contact Us</h2>
                <p>If you have any questions or concerns about our Privacy Policy, please contact us at {contactEmail}.</p>
            </div>
            <p className='w3-margin'>           
                <Link className='w3-margin w3-btn w3-round w3-theme-d5 w3-padding w3-large' to='/'><FaHome/></Link>
            </p>
        </div>  );
}

export default PrivacyPolicy;