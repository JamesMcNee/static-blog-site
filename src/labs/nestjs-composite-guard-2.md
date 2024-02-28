---
layout: layouts/lab.njk
title: 'NestJS composite guards'
subheading: 'A brief explainer on how to create a composite guard in NestJS, and why you might want one'
synopsis: NestJS is a powerful IoC framework for NodeJS, one of the features of which are guards, which allow for higher order authentication on API routes. This explainer shows how to create a composite guard...
date: 2024-02-28
---

[NestJS](https://nestjs.com/) is a powerful IoC (Inversion of Control) framework for NodeJS, it has very similar semantics to the Angular (2+) framework and provides features such as route/endpoint abstraction and dependency injection. One of the key concepts in NestJS is [guards](https://docs.nestjs.com/guards), quite simply a guard controls access to an API route. For example, you may have a guard on the `/admin` section of your API, so that only admin users can access these routes.

A guard and its usage usually looks like the following:
```typescript
import { Injectable, CanActivate, ExecutionContext, UseGuards, Controller, Post} from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {

    constructor(private readonly authProvider: AuthProvider) {}

    public async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        const authorizationHeaderValue = request.get('Authorization')

        return authProvider.isAdmin(authorizationHeaderValue);
    }
}

@Controller('admin')
export class AdminController {
    
    @Post('/secure')
    @UseGuards(AdminGuard)
    public async superSecureEndpoint(): Promise<void> {
        console.log('Very secure thing done!')
    }
}
```

This is great and extremely useful to secure our endpoints with reusable and easily testable code. You can supply multiple guards to the `@UseGuards` decorator to add multiple layers of security to an API, these are applied in an `AND` fashion, i.e. all guards must return true for access to be granted.

Unfortunately, NestJS does not provide an out-of-the-box mechanism to define a composite `OR` based guard, i.e. as long as one of the conditions is satisfied, allow access.

#### The MatchAny Guard
We can build this ourselves though, let's take a look:
```typescript
import type { CanActivate, ExecutionContext, Type } from '@nestjs/common'
import { Inject, Injectable } from '@nestjs/common'
import { ModuleRef, Reflector } from '@nestjs/core'

/**
 * Takes injectable guard types or premade guard instances and ensures that at least one of them yields true to allow access
 */
export const MatchAnyGuard =
  Reflector.createDecorator<(CanActivate | Type<CanActivate>)[]>()

@Injectable()
export class MatchAny implements CanActivate {
    
  constructor(@Inject(Reflector) private readonly reflector: Reflector, 
              @Inject(ModuleRef) private readonly moduleRef: ModuleRef) {}

  public async canActivate(
    this: MatchAny,
    context: ExecutionContext
  ): Promise<boolean> {
    const rawGuardParams = this.reflector.get(MatchAnyGuard, context.getHandler())

    // No guards registered, allow access
    if (isNullOrUndefined(rawGuardParams) || rawGuardParams.length === 0) {
      return true
    }

    // Ensure all the guards are instances, rather than types
    const guards: CanActivate[] = await Promise.all(
      rawGuardParams.map((guardClass: CanActivate | Type<CanActivate>) => {
        if (typeof guardClass === 'function') {
          return this.moduleRef.create(guardClass)
        }

        return guardClass
      })
    )
      
    // Run all of the guards and wait until they have all settled (resolved or rejected) 
    const results = await Promise.allSettled(
      guards.map((guard) => guard.canActivate(context))
    )
      
    // Return true if any guard yielded a true result  
    return results.some(
      (result) => result.status === 'fulfilled' && result.value === true
    )
  }
}
```

What we have above is itself a guard, but one that uses reflection to delegate to others. We have created a new decorator `@MatchAnyGuard` which takes either
- An injectable guard class (that implements the CanActivate interface)
- Pre-constructed guard instances

The former of these is what makes this mechanism extremely useful as users of this composite guard can still benefit from dependency injection. This is made possible by asking the NestJS framework to inject the reference to the current module (`ModuleRef`) which we can then use to dynamically create and 'wire' providers at runtime.

In terms of using this new composite guard, let's take a look at the example from before:
```typescript
import { UseGuards, Controller, Post } from '@nestjs/common'
import { MatchAny, MatchAnyGuard, AdminGuard, SuperAdminGuard } from './guards'


@UseGuards(MatchAny)
@Controller('admin')
export class AdminController {
    
    @Post('/secure')
    @MatchAnyGuard([AdminGuard, SuperAdminGuard])
    public async superSecureEndpoint(): Promise<void> {
        console.log('Very secure thing done, by either an admin, or the ellusive super admin!')
    }
}
```

Note here that we still need the `@UseGuards` decorator, this is because our `@MatchAnyGuard` decorator is just describing the guards that should be used by the `MatchAny` guard, it does not itself enable guards.

There are a few ways that one might remove the need for adding `@UseGuards(MatchAny)` to any function/class that it's used, let's take a look at two of them...

#### App guards
It's possible to wire up a guard so that it applies to all routes on the application, this is done by using a special injection token that NestJS provides. In a module (the main app one is most appropriate), you can do the following:
```typescript
import { APP_GUARD } from '@nestjs/core';
import { MatchAny } from './guards'

@Module({
  providers: [
      {
          provide: APP_GUARD,
          useClass: MatchAny
      }
  ],
})
export class AppModule {}
```

Now, any route that is decorated with `MatchAnyGuard(...)` will work without the need for a local `@UseGuards`! One of the great things about this approach is that it makes routes easily testable, without having to mock out bits of the guards themselves as you can simply wire up a mock `MatchAny` guard as the `APP_GUARD` in your tests.

#### Higher order decorator
Nest provide a function that allows you to create a decorator that applies multiple other decorators when used, so we could for example use this to create a higher order decorator.

```typescript
import { applyDecorators, CanActivate, Type, UseGuards } from '@nestjs/common'

export function MatchAnyGuard(
    ...guards: (CanActivate | Type<CanActivate>)[]
): MethodDecorator {
    return applyDecorators(UseGuards(MatchAny), OriginalMatchAnyGuardDecorator(guards))
}
```

In the above, `OriginalMatchAnyGuardDecorator` is a renamed version of the original `MatchAnyGuard` defined in the above section. Now whenever you use `MatchAnyGuard(GuardA, GuardB)` it will also apply the `@UseGuards(MatchAny)` decorator. Whilst this approach is pretty neat, it does hamper testing somewhat as there is no place to inject a mock.