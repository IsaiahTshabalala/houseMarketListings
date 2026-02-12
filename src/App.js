/**
 * File: ./src/app.js
 * Description: The root of the application.
 * Start Date  End Date    Dev   Version   Description
 * 2023/07/26              ITA   1.00      Genesis
 * 2024/01/17              ITA   1.01      Add more routes. To accomodate more features.
 * 2024/07/03              ITA   1.02      Add versions to the patch descriptions.
 *                                         Add the Title component (Discounted Listings) on top of the Listings component for the route /search/offers/listings/.
 *                                         Update route /search to /search/all, so that /search menu items are correctly highlightable, per selected item or current url.
 *                                         User to be navigated to the home page if unavailable url path entered.
 * 2024/09/17              ITA   1.03      Remove the CollectionProvider context around the Listing and Listings components. No longer needed. Current User state moved to Global State.
 *                                         as more state, the locations (url) history is also moved there.
 *                                         Routes defined separately, making code more readable and maintainable.
 *                                         Removed search menu items and routes. Search functionality has been moved to the home page (/).
 * 2024/01/16  2026/01/16  ITA   1.04      Collections context and provider removed, in keeping up with the dropdowns-js update.
 */
import MenuBar from './components/MenuBar';
import SignIn from './components/SignIn';
import SignOut from './components/SignOut';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import Private from './components/Private';
import ErrorPage2 from './components/ErrorPage2';
import ErrorPage from './components/ErrorPage';
import PrivacyPolicy from './components/PrivacyPolicy';
import AccountInfo from './components/AccountInfo';
import EmailVerificationSentPage from './components/EmailVerificationSentPage';
import PasswordResetPage from './components/PasswordResetPage';
import './App.css';
import './index.css';
import { RouterProvider, createBrowserRouter, Outlet } from 'react-router-dom';
import GlobalStateProvider from './hooks/GlobalStateProvider';
import MyListings from './components/MyListings';
import Listing from './components/Listing';
import CurrentUserState from './components/CurrentUserState';
import SharedVarsProvider from './hooks/SharedVarsProvider';
import AddOrEditListing from './components/AddOrEditListing';
import Moderator from './components/Moderator';
import LocationsRecorder from './components/LocationsRecorder';
import Reports from './components/Reports';
import { Navigate } from 'react-router-dom';
import Explore from './components/Explore';

const routes = [
    {
        path: '/error/:message',
        element: 
                <>
                    <LocationsRecorder/>
                    <MenuBar/>
                    <ErrorPage/>
                </>
    },
    {
        path: '/',
        element:
                <>
                    <LocationsRecorder/>
                    <MenuBar/>
                    <SharedVarsProvider>
                        <Outlet/>
                    </SharedVarsProvider>
                </>,
        errorElement: <Navigate to='/' />,
        children: [
            {
                path: '/',
                element: <Explore/>
            },
            {
                path: ':listingId',
                element: <Listing/>
            },
            {
                path: ':listingId/edit',
                element: <AddOrEditListing/>
            }
        ]
    },
    {
        path: '/about/privacy',
        element:       
                <>
                    <LocationsRecorder/>
                    <MenuBar/>
                    <PrivacyPolicy/>
                </>
    },
    {
        path: '/signin',
        element: <SignIn/>
    },
    {
        path: '/signout',
        element: <SignOut/>
    },
    {
        path: '/register',
        element: <Register/>
    },
    {
        path: '/email-verification-sent',
        element: <EmailVerificationSentPage/>
    },
    {
        path: '/error/auth/email-already-in-use',
        element: <ErrorPage2 message='There is already an account registered with this email!'/>
    },
    {
        path: '/forgot-password',
        element: <ForgotPassword/>
    },
    {
        path: '/password-reset',
        element: <PasswordResetPage/>
    },
    {
        path: '/my-profile',
        element:
                <>
                    <LocationsRecorder/>
                    <MenuBar/>
                    <Private/>
                </>,
        children: [
            {
                path: 'account',
                element: <AccountInfo/>
            },
            {
                path: 'listings',
                element:
                        /**MyListings and Listing components share the clickedListing shared variable.
                         * Hence the SharedVarsProvider useContext hook.
                        */
                        <SharedVarsProvider>
                            <Outlet/>
                        </SharedVarsProvider>,
                children: [
                    {
                        path: '/my-profile/listings',
                        element: <MyListings/>
                    },
                    {
                        path: '/my-profile/listings/:listingId',
                        element: 
                                <Listing/>
                    },
                    {
                        path: '/my-profile/listings/:listingId/edit',
                        element: <AddOrEditListing/>
                    },
                    {
                        path: '/my-profile/listings/new',
                        element: <AddOrEditListing/>
                    }
                ]
            },
            {
                path: '/my-profile/privacy',
                element: <PrivacyPolicy/>
            }
        ]                            
    },
    {
        path: '/moderation',
        element:
                <>
                    <LocationsRecorder/>
                    <MenuBar/>
                    <SharedVarsProvider>
                        <Moderator/>                                                   
                    </SharedVarsProvider>
                </>,
        children: [
            {
                path: '/moderation',
                element: <Reports/>
            },
            {
                path: '/moderation/:listingId',
                element: <Listing/> // The <Listing/> components share the sellers collection (via <CollectionProvider/>) amongst themselves.
            }
        ]
    }
];

function App() {
    
    return (
        <GlobalStateProvider>            
            <CurrentUserState>
                <RouterProvider
                    router = {
                        createBrowserRouter(routes)
                    }
                />
            </CurrentUserState>
        </GlobalStateProvider>
    );
}

export default App;
