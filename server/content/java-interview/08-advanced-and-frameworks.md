---
title: "Advanced Java & Frameworks"
description: "Master Serialization, Reflection, Spring Boot basics, and Design Patterns."
---

## 1. What is Serialization?
It is the process of converting an object's state into a byte stream so it can be saved to a file, database, or sent over a network. Deserialization is the reverse process.

## 2. How do you serialize an object?
The class must implement the `java.io.Serializable` marker interface. You then use `ObjectOutputStream` to write the object to a stream.

## 3. What is `serialVersionUID`?
It is a unique identifier for a serialized class. During deserialization, the JVM compares the ID in the byte stream with the ID of the local class. If they mismatch (e.g., you added a field to the class), an `InvalidClassException` is thrown.

## 4. What is the Reflection API?
Reflection allows Java code to inspect and manipulate classes, interfaces, fields, and methods at runtime, even if they are private. It is heavily used by frameworks like Spring and Hibernate.

## 5. What are the drawbacks of using Reflection?
It breaks encapsulation (you can modify private fields), it is slower than normal code execution, and it can cause security issues if used maliciously.

## 6. What is an Annotation?
Annotations (like `@Override`, `@Deprecated`) provide metadata about the code to the compiler or runtime. Custom annotations can be read at runtime using Reflection to trigger framework behavior (e.g., `@Entity`, `@Autowired`).

## 7. What is JDBC?
Java Database Connectivity. It is an API that allows Java applications to connect to relational databases, execute SQL queries, and retrieve results.

## 8. What is the difference between `Statement` and `PreparedStatement`?
- `Statement`: Used for static SQL. Susceptible to SQL Injection attacks.
- `PreparedStatement`: Pre-compiled SQL with parameters (`?`). It is much faster for repeated executions and entirely prevents SQL Injection.

## 9. What is the Singleton Design Pattern?
It ensures that a class has only one instance in the entire JVM, and provides a global point of access to it. It usually involves a private constructor, a static instance variable, and a `getInstance()` method.

## 10. What is the Factory Design Pattern?
A creational pattern that provides an interface or abstract class for creating objects, but allows subclasses to decide which concrete class to instantiate. It hides the complex creation logic from the client.

## 11. What is Dependency Injection (DI)?
A core concept of Spring. Instead of objects creating their own dependencies using `new`, the framework "injects" the required dependencies into the object at runtime via constructors or setters, making the system highly decoupled and testable.

## 12. What is Inversion of Control (IoC)?
IoC is the principle where the control of object creation and lifecycle management is transferred from the application code to a framework (like the Spring IoC Container).

## 13. What is Spring Boot?
An extension of the Spring framework that eliminates boilerplate configuration. It provides "Starter" dependencies, an embedded server (like Tomcat), and auto-configuration to rapidly build production-ready applications.

## 14. What does the `@SpringBootApplication` annotation do?
It is a convenience annotation that combines three others:
- `@Configuration`: Allows defining Spring Beans.
- `@EnableAutoConfiguration`: Tells Spring Boot to guess and configure beans based on classpath settings.
- `@ComponentScan`: Scans the current package for Spring components.

## 15. What is the difference between `@Component`, `@Service`, and `@Repository`?
All three register a class as a Spring Bean.
- `@Component`: A generic stereotype for any Spring-managed component.
- `@Service`: Specifically annotates classes holding business logic.
- `@Repository`: Annotates DAOs (Data Access Objects) and automatically translates database exceptions into Spring's `DataAccessException`.

## 16. What is a REST API?
Representational State Transfer. It is an architectural style for designing networked applications using standard HTTP methods (GET, POST, PUT, DELETE) and returning data typically in JSON format.

## 17. How do you create a REST endpoint in Spring Boot?
You annotate a class with `@RestController` and its methods with mapping annotations like `@GetMapping("/users")` or `@PostMapping("/users")`. Spring automatically serializes the returned objects into JSON.

## 18. What is JPA and Hibernate?
- **JPA (Java Persistence API)**: A specification/interface in Java for Object-Relational Mapping (ORM) to manage relational data in Java apps.
- **Hibernate**: A popular, concrete framework that actually implements the JPA specification.

## 19. What is a Builder Design Pattern?
It separates the construction of a complex object from its representation. Instead of having a constructor with 15 parameters (Telescoping Constructor Anti-pattern), you use a Builder class to chain method calls (e.g., `.name("X").age(10).build()`).

## 20. What is Java Native Interface (JNI)?
A programming framework that enables Java code running in the JVM to call, and be called by, native applications and libraries written in other languages such as C, C++, and Assembly.
