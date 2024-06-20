/**
 * File: ./src/app.js
 * Description: The root of the application.
 * Date         Dev   Description
 * 2023/07/26   ITA   Genesis
 * 2024/01/17   ITA   Add more routes. To accomodate more features.
 */
import MenuBar from './components/MenuBar';
import SignIn from './components/SignIn';
import SignOut from './components/SignOut';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import Private from './components/Private';
import ErrorPage2 from './components/ErrorPage2';
import ErrorPage from './components/ErrorPage';
import SearchListings from './components/SearchListings';
import AccountInfo from './components/AccountInfo';
import EmailVerificationSentPage from './components/EmailVerificationSentPage';
import PasswordResetPage from './components/PasswordResetPage';
import './App.css';
import './index.css';
import { RouterProvider, createBrowserRouter, Outlet } from 'react-router-dom';
import UserProvider from './hooks/UserProvider';
import Heading from './components/Heading';
import MyListings from './components/MyListings';
import Listings from './components/Listings';
import Listing from './components/Listing';
import CurrentUserState from './components/CurrentUserState';
import CollectionsProvider from './hooks/CollectionsProvider';
import SharedVarsProvider from './hooks/SharedVarsProvider';
import AddOrEditListing from './components/AddOrEditListing';
import Explore from './components/Explore';
import ExploreProvince from './components/ExploreProvince';
import Moderator from './components/Moderator';
import LocationsProvider from './hooks/LocationsProvider';
import LocationsRecorder from './components/LocationsRecorder';
import Reports from './components/Reports';

function App() {
    
    return (
        <UserProvider>
            <LocationsProvider>
                <RouterProvider
                    router = {
                        createBrowserRouter(
                        [
                            {
                                path: '/error/:message',
                                element: 
                                        <>
                                            <MenuBar/>
                                            <LocationsRecorder/>
                                            <ErrorPage/>
                                        </>
                            },
                            {
                                path: '/',
                                element:
                                        <>
                                            <MenuBar/>
                                            <LocationsRecorder/>
                                            <SharedVarsProvider>
                                                <CurrentUserState>
                                                    <Outlet/>
                                                </CurrentUserState>
                                            </SharedVarsProvider>
                                        </>,
                                children: [
                                    {
                                        path: '/',
                                        element: <Explore/>
                                    },
                                    {
                                        path: '/explore',
                                        element: <Outlet/>,
                                        children: [
                                            {
                                                path: '/explore/:provincialCode',
                                                element: <ExploreProvince/>
                                            },
                                            {
                                                path: '/explore/:provincialCode/:municipalityCode/:mainPlaceCode',
                                                element: /** Collection provider used in order for <Listing/> components to share sellers collection
                                                                amongst themselves. */
                                                        <CollectionsProvider>
                                                            <Outlet/>
                                                        </CollectionsProvider>,
                                                children: [
                                                    {
                                                        path: '/explore/:provincialCode/:municipalityCode/:mainPlaceCode',
                                                        element: <Listings/>
                                                    },
                                                    {
                                                        path: '/explore/:provincialCode/:municipalityCode/:mainPlaceCode/:listingId',
                                                        element: <Listing/>
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ],
                                errorElement: <ErrorPage2 message='Path not found.'/>
                            },
                            {
                                path: '/search',
                                element:
                                        <>
                                            <MenuBar/>                                        
                                            <LocationsRecorder/>
                                            <CurrentUserState>
                                                <Outlet/>
                                            </CurrentUserState>
                                        </>,
                                children: [
                                    {
                                        path: '/search/',
                                        element: 
                                                /**All children of this component will share data such as selected provinces,
                                                 * selected main places and selected sub-places. Also the queryed listings. 
                                                 * Hence the SharedVarsProvider useContext hook.
                                                     */
                                                <SharedVarsProvider>
                                                    <Outlet/>
                                                </SharedVarsProvider>,
                                            children: [
                                                { 
                                                    path: '/search/',
                                                    element:
                                                            /**SearchListings component shares collections with its dropdown components within it.
                                                             * Hence the <CollectionsProvider/> useContext hook. */
                                                            <CollectionsProvider>
                                                                <>
                                                                    <Heading title='Search for Property Listings'/>
                                                                    <SearchListings/>
                                                                </>
                                                            </CollectionsProvider>
                                                },
                                                { 
                                                    path: '/search/listings',
                                                    element:                                                        
                                                            /** The Listing components share sellers collection amongst themselves.
                                                             * Hence the CollectionsProvider useContext hook. */
                                                            <CollectionsProvider>
                                                                <Outlet/>
                                                            </CollectionsProvider>,
                                                    children: [
                                                        {
                                                            path: '/search/listings/',
                                                            element: 
                                                                    <>
                                                                        <Heading title='Listings'/>
                                                                        <Listings/>
                                                                    </>
                                                        },
                                                        {
                                                            path: '/search/listings/:listingId',
                                                            element: <Listing/>
                                                        }
                                                    ]
                                                },
                                                {
                                                    path: '/search/offers',
                                                    element:
                                                            <Outlet/>,
                                                    children: [
                                                        {
                                                            path: '/search/offers/',
                                                            element: 
                                                                    /**SearchListings component shares collections (provinces, municipalities, main places, sub-places)
                                                                     * with its dropdown components within it. Hence the <CollectionsProvider/> useContext hook. */
                                                                    <CollectionsProvider>
                                                                        <>
                                                                            <Heading title='Search for Property Listings with Discounts'/>
                                                                            <SearchListings/>
                                                                        </>
                                                                    </CollectionsProvider>
                                                        },
                                                        {
                                                            path: '/search/offers/listings',
                                                            element: 
                                                                    <CollectionsProvider>
                                                                        <Outlet/>
                                                                    </CollectionsProvider>,
                                                            children: [
                                                                {
                                                                    path: '/search/offers/listings/',
                                                                    element: <Listings/>
                                                                },
                                                                {
                                                                    path: '/search/offers/listings/:listingId',
                                                                    element: 
                                                                            /**The Listing components share the sellers collection amongst them. */
                                                                            <Listing/>
                                                                }
                                                            ]
                                                        }
                                                    ]
                                                }
                                            ]

                                    }
                                ],
                                errorElement: <ErrorPage2 message='Path not found.'/>
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
                                            <MenuBar/>                                        
                                            <LocationsRecorder/>
                                            <CurrentUserState>
                                                <Private/>
                                            </CurrentUserState>
                                        </>,
                                children: [
                                    {
                                        path: 'account',
                                        element: /**The AccountInfo component shares the collections (provinces, municipalities, main places, sub-places)
                                                    with its dropdowns. Hence the CollectionProvider hook. */
                                                <CollectionsProvider>
                                                    <AccountInfo/>
                                                </CollectionsProvider>
                                    },
                                    {
                                        path: 'listings',
                                        element:
                                                /**MyListings and Listing components share the clickedListing shared variable.
                                                 * Hence the SharedVarsProvider useContext hook.
                                                 * The 
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
                                                        <CollectionsProvider>
                                                            <Listing/>
                                                        </CollectionsProvider>
                                            },
                                            {
                                                path: '/my-profile/listings/:listingId/edit',
                                                element: /**The AddOrEditListing component shares collections (provinces, municipalities, main places, sub-place)
                                                            with its dropdowns. Hence the CollectionsProvider useContext hook. */
                                                        <CollectionsProvider>
                                                            <AddOrEditListing/>
                                                        </CollectionsProvider>
                                            },
                                            {
                                                path: '/my-profile/listings/new',
                                                element: /**AddOrEditListing component shares collections (provinces, municipalities, main places, sub-places)
                                                                with its dropdowns. */
                                                        <CollectionsProvider>
                                                            <AddOrEditListing/>
                                                        </CollectionsProvider>
                                            }
                                        ]
                                    }
                                ]                            
                            },
                            {
                                path: '/moderation',
                                element:
                                        <> 
                                            <MenuBar/>
                                            <LocationsRecorder/>
                                            <CollectionsProvider>
                                                <SharedVarsProvider>
                                                    <Moderator/>                                                   
                                                </SharedVarsProvider>
                                            </CollectionsProvider>
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
                        ])
                    }
                />
            </LocationsProvider>
        </UserProvider>
    );
}

export default App;
