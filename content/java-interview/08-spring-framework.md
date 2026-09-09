---
title: "Spring Framework & Boot"
description: "Inversion of Control, Beans, MVC, JPA, and Spring Boot magic."
---

## 1. What is the Spring Framework?
An open-source, enterprise-level Java framework that provides comprehensive infrastructure support for developing Java applications. Its core features are Dependency Injection (DI) and Aspect-Oriented Programming (AOP).

## 2. What is Inversion of Control (IoC)?
A design principle where the control of object creation and lifecycle management is transferred from the application code to a framework or container. In Spring, the **IoC Container** creates objects, wires them together, and manages their entire lifecycle.

## 3. What is Dependency Injection (DI)?
The concrete implementation of IoC. Instead of a class creating its own dependencies using the `new` keyword, the Spring container injects the required dependencies into the class (usually via constructor).

```java
@Service
public class UserService {
    private final UserRepository repo;

    // Spring injects the UserRepository automatically
    @Autowired 
    public UserService(UserRepository repo) {
        this.repo = repo;
    }
}
```

## 4. What is a Spring Bean?
An object that forms the backbone of your application and is managed by the Spring IoC container. Beans are created, initialized, wired, and destroyed by the container.

## 5. What are the Spring Bean Scopes?
- **Singleton (Default)**: Only one instance of the bean is created per Spring container.
- **Prototype**: A new instance is created every time the bean is requested.
- **Request**: A new instance per HTTP request (Web only).
- **Session**: A new instance per HTTP session (Web only).

## 6. What is the difference between `@Component`, `@Service`, and `@Repository`?
All three are used to define Spring Beans, but they serve as semantic markers for the developer and framework:
- `@Component`: Generic stereotype for any Spring-managed component.
- `@Service`: Marks a class holding business logic.
- `@Repository`: Marks a Data Access Object (DAO) that interacts with the database. Spring automatically catches SQLExceptions here and translates them into Spring's `DataAccessException`.

## 7. What is Spring Boot?
An extension of the Spring framework that eliminates boilerplate configurations required to set up a Spring application. It takes an "opinionated" approach, providing auto-configuration and embedded servers (like Tomcat) to get apps running immediately.

## 8. What does `@SpringBootApplication` do?
It is a convenience annotation that combines three critical annotations:
1. `@Configuration`: Tags the class as a source of bean definitions.
2. `@EnableAutoConfiguration`: Tells Spring Boot to start adding beans based on classpath settings (e.g., if Tomcat is on the classpath, setup a web server).
3. `@ComponentScan`: Tells Spring to look for other components, configurations, and services in the current package and its sub-packages.

## 9. What is Spring MVC?
A web framework built on the Model-View-Controller design pattern.
- The `DispatcherServlet` acts as the Front Controller, receiving all HTTP requests and routing them to the appropriate `@Controller` based on the URL mapping.

## 10. What is the difference between `@Controller` and `@RestController`?
- `@Controller`: Used for traditional web apps. Methods return a String representing a View template (like JSP or Thymeleaf) to render HTML.
- `@RestController`: Used for RESTful APIs. It combines `@Controller` and `@ResponseBody`. Methods directly return objects, which Spring automatically serializes into JSON/XML.

```java
@RestController
@RequestMapping("/api/users")
public class UserController {
    @GetMapping("/{id}")
    public User getUser(@PathVariable String id) {
        return new User(id, "Alice"); // Automatically converted to JSON
    }
}
```

## 11. What is `@Autowired`?
An annotation used to auto-wire dependencies. Spring looks for a matching bean in the container and injects it. Constructor injection is highly recommended over Field injection.

## 12. What happens if multiple beans of the same type exist during `@Autowired`?
Spring throws a `NoUniqueBeanDefinitionException`. You resolve this by:
1. Using `@Primary` on one of the implementations to make it the default.
2. Using `@Qualifier("beanName")` alongside `@Autowired` to specify exactly which bean to inject.

## 13. What is Aspect-Oriented Programming (AOP)?
A programming paradigm that aims to increase modularity by allowing the separation of cross-cutting concerns (logic that affects the whole application, like Logging, Security, and Transaction Management) from the main business logic.

## 14. What are the key terms in AOP?
- **Aspect**: A class containing the cross-cutting concern (e.g., a `LoggingAspect`).
- **Join Point**: A point during execution where an aspect *can* be plugged in (e.g., method execution).
- **Pointcut**: An expression that selects exactly *which* Join Points should be intercepted.
- **Advice**: The action taken by an aspect at a particular Pointcut (e.g., `@Before`, `@After`, `@Around`).

## 15. What is Spring Data JPA?
An abstraction layer built on top of JPA (Java Persistence API) / Hibernate. It drastically reduces boilerplate code by generating data access implementations automatically based on repository interfaces.

```java
// Spring generates the implementation automatically!
public interface UserRepository extends JpaRepository<User, Long> {
    List<User> findByLastName(String lastName);
}
```

## 16. What is the difference between `@Entity` and `@Table`?
- `@Entity`: A JPA annotation marking the class as a persistent database entity.
- `@Table`: Specifies the actual table name in the database if it differs from the class name.

## 17. What is `@Transactional`?
An annotation that defines the scope of a single database transaction. If the method completes successfully, the transaction is committed. If a `RuntimeException` occurs, the entire transaction is rolled back.

```java
@Transactional
public void transferMoney(Account from, Account to, double amount) {
    from.withdraw(amount);
    to.deposit(amount); // If this fails, the withdrawal is rolled back
}
```

## 18. What is ApplicationContext vs BeanFactory?
Both represent the IoC container, but `ApplicationContext` is the advanced version.
- **BeanFactory**: Basic DI. Loads beans lazily (only when requested).
- **ApplicationContext**: Loads all Singleton beans eagerly at startup. Provides extra enterprise features like Event publication, AOP integration, and internationalization (i18n).

## 19. How do you handle Exceptions globally in Spring Boot?
Using the `@ControllerAdvice` and `@ExceptionHandler` annotations. This allows you to centralize exception handling logic across all controllers and return standardized JSON error responses.

```java
@ControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<String> handleNotFound(Exception ex) {
        return new ResponseEntity<>(ex.getMessage(), HttpStatus.NOT_FOUND);
    }
}
```

## 20. What is Spring Boot Actuator?
A sub-project of Spring Boot that provides built-in production-ready endpoints to monitor and manage your application (e.g., `/actuator/health` to check if the app is up, `/actuator/metrics` for memory/CPU usage).
