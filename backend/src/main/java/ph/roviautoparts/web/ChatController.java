package ph.roviautoparts.web;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import ph.roviautoparts.dto.Dtos.ChatMessageDto;
import ph.roviautoparts.dto.Dtos.ChatSend;
import ph.roviautoparts.security.CurrentUser;
import ph.roviautoparts.service.ChatService;

import java.util.List;
import java.util.Map;

/** The customer's side of their thread with the shop. */
@RestController
@RequestMapping("/api/chat")
public class ChatController {
    private final ChatService chat;
    private final CurrentUser current;

    public ChatController(ChatService chat, CurrentUser current) {
        this.chat = chat;
        this.current = current;
    }

    @GetMapping("/messages")
    public List<ChatMessageDto> messages() {
        return chat.thread(current.id());
    }

    @PostMapping("/messages")
    public ChatMessageDto send(@Valid @RequestBody ChatSend req) {
        return chat.sendFromCustomer(current.id(), req);
    }

    @PostMapping("/read")
    public Map<String, Boolean> read() {
        chat.markRead(current.id(), false);
        return Map.of("ok", true);
    }

    @GetMapping("/unread")
    public Map<String, Long> unread() {
        return Map.of("unread", chat.unreadForCustomer(current.id()));
    }
}
