import { forwardRef } from 'react';
import { NavLink as RouterNavLink, type NavLinkProps } from 'react-router-dom';
import { cn } from '@/lib/utils';

type Props = Omit<NavLinkProps, 'className'> & {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
};

/**
 * NavLink com API `activeClassName` (estilo v5) por cima do NavLink do react-router v6.
 */
export const NavLink = forwardRef<HTMLAnchorElement, Props>(
  ({ className, activeClassName, pendingClassName, ...props }, ref) => (
    <RouterNavLink
      ref={ref}
      className={({ isActive, isPending }) =>
        cn(className, isActive && activeClassName, isPending && pendingClassName)
      }
      {...props}
    />
  )
);
NavLink.displayName = 'NavLink';
