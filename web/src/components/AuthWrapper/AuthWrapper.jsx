import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import propTypes from 'prop-types';
import './AuthWrapper.css';
import { fireModal } from 'actions/actionModalActions';
import {
  useGetOwned,
  useGetHasRole,
  useGetHasAccountType,
} from 'customHooks/permissions';
import { registerModal, upgradeAccountModal, forkProjectModal } from './popupInformation';

/**
 * AuthWrapper
 *
 * If passes: render the children.
 * If fails and norender is true: render nothing.
 * Else render a wrapped children with specific behaviour.
 *
 * @param {Boolean} owneronly if ownership is required.
 * @param {Number[int]} minRole the min role required https://docs.gitlab.com/ee/api/access_requests.html#valid-access-levels
 * @param {Number[int]} accountType the account level required (1 bronze, 2 silver...).
 * @param {Object[type, id]} resource if given will lookup in projects.all
 * @param {Boolean} norender if check failed then the wrapped won't be rendered.
 * @param {Object} style overwrite styles to help with positioning and apperance.
 * @param {String} className add classes to the wrapper for positioning (only if fails).
 * @param {Boolean} debug print in console a table for debug.
 * @param {node} children this is the wrapped element.
 */
const AuthWrapper = (props) => {
  const {
    owneronly,
    minRole: role,
    accountType,
    resource,
    norender,
    style,
    className,
    debug,
    children,
    visitorAllowed,
  } = props;

  const history = useHistory();
  const dispatch = useDispatch();

  const {
    user: { auth },
    projects: {
      selectedProject: { id: projectId },
    },
  } = useSelector((state) => state);

  // means is owner or ownership not required
  const owned = useGetOwned(owneronly, resource);

  // means has role enough high or role is not required
  const hasRole = useGetHasRole(role, resource);

  // means account tier is enough or account level is not required
  const hasAccountType = useGetHasAccountType(accountType);

  // children render normally
  const allowed = useMemo(
    () => (visitorAllowed || auth) && (owned || hasRole) && hasAccountType,
    [owned, hasRole, hasAccountType, visitorAllowed, auth],
  );

  // so far these are informative classes, no more.
  const classes = useMemo(() => ({
    main: `auth-wrapper
      ${!owned ? 'ownership-required' : ''}
      ${!hasRole ? 'group-role-required' : ''}
      ${!hasAccountType ? 'project-role-required' : ''}
    `,
  }), [owned, hasRole, hasAccountType]);

  // this will be displayed as tooltip when hover
  const message = useMemo(
    () => {
      if (!(visitorAllowed || auth)) return 'Please login';
      if (!owned) return 'Only the owner, you can fork it!';
      if (!hasRole) return 'You need a proper role.';
      if (!hasAccountType) return 'Upgrade your account';

      return 'You need permission to use this feature';
    },
    [owned, hasRole, hasAccountType, visitorAllowed, auth],
  );

  // fired if user click the cover
  const handleClick = () => {
    if (!(visitorAllowed || auth)) return dispatch(fireModal({
      ...registerModal,
      // this will be executed when UPGRADE button is clicked
      onNegative: () => history.push('/register'),
      onPositive: () => history.push('/login?redirect=goback'),
    }));
    // if user has not enough account tier a popup will be fired
    if (!hasAccountType) return dispatch(fireModal({
      ...upgradeAccountModal,
      // this will be executed when UPGRADE button is clicked
      onPositive: () => history.push('/account/upgrade'),
    }));

    // fired of no enough permission
    if (!hasRole) return dispatch(fireModal({
      ...forkProjectModal,
      // this will be executed when FORK button is clicked
      onPositive: () => history.push(`/my-projects/${projectId}/fork`),
    }));

    return null;
  };

  // this is a table that only print if debug is true
  // eslint-disable-next-line
  debug && console.table({ owneronly, owned, role, hasRole, accountType, hasAccountType, allowed });

  // eslint-disable-next-line
  return allowed ? children : (norender ? null : (
    <div title={message} className={`${className} ${classes.main}`} style={style}>
      {/* eslint-disable-next-line */}
      <div onClick={handleClick} className="auth-wrapper-cover"></div>
      <div className="auth-wrapper-wrapped">
        {children}
      </div>
    </div>
  ));
};

AuthWrapper.defaultProps = {
  owner: false,
  role: 0,
  accountType: 0,
  resource: {
    type: 'project',
    id: 0,
  },
  norender: false,
  visitorAllowed: false,
  style: {},
  className: '',
};

AuthWrapper.propTypes = {
  owner: propTypes.bool,
  role: propTypes.number,
  accountType: propTypes.number,
  norender: propTypes.bool,
  resource: propTypes.shape({
    type: propTypes.string,
    id: propTypes.number,
  }),
  debug: propTypes.bool,
  visitorAllowed: propTypes.bool,
  className: propTypes.string,
  // children:
};

export default AuthWrapper;
